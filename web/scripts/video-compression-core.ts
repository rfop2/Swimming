import mysql from "mysql2/promise"
import { randomUUID } from "node:crypto"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createReadStream, createWriteStream, promises as fs  } from "node:fs"

import { spawn } from "node:child_process"
import { pipeline } from "node:stream/promises"
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"

export const VIDEO_COMPRESSION_STATUS_IDS = {
  none: 1,
  pending: 2,
  queued: 3,
  processing: 4,
  completed: 5,
  failed: 6,
} as const

const getRequiredEnv = ( name: string ) => {
  const value = process.env[name]?.trim()
  if ( !value ) {
    throw new Error( `Missing env: ${name}` )
  }
  return value
}

export const pool = mysql.createPool( {
  host: getRequiredEnv( "MARIADB_HOST" ),
  port: Number( getRequiredEnv( "MARIADB_PORT" ) ),
  user: getRequiredEnv( "MARIADB_USER" ),
  password: getRequiredEnv( "MARIADB_PASSWORD" ),
  database: getRequiredEnv( "MARIADB_DATABASE" ),
  waitForConnections: true,
  connectionLimit: 5,
} )

const s3 = new S3Client( {
  region: getRequiredEnv( "AWS_REGION" ),
  credentials: {
    accessKeyId: getRequiredEnv( "AWS_ACCESS_KEY_ID" ),
    secretAccessKey: getRequiredEnv( "AWS_SECRET_ACCESS_KEY" ),
  },
} )

const bucket = getRequiredEnv( "AWS_S3_BUCKET" )
const cloudfrontUrl = getRequiredEnv( "AWS_CLOUDFRONT_URL" ).replace( /\/+$/, "" )

const runFfmpeg = ( inputPath: string, outputPath: string ) =>
  new Promise<void>( ( resolve, reject ) => {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "26",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ]

    const child = spawn( "ffmpeg", args, {
      stdio: "inherit",
    } )

    child.on( "error", reject )
    child.on( "close", code => {
      if ( code === 0 ) {
        resolve()
        return
      }
      reject( new Error( `ffmpeg exited with code ${code}` ) )
    } )
  } )

export const claimNextQueuedVideo = async () => {
  const conn = await pool.getConnection()

  try {
    const [ rows ] = await conn.query(
      `
      SELECT id
      FROM VideoTimerVideos
      WHERE compressionStatusId = ?
      ORDER BY compressionQueuedAt ASC, created ASC
      LIMIT 1
      `,
      [ VIDEO_COMPRESSION_STATUS_IDS.queued ]
    )

    const row = Array.isArray( rows ) && rows.length
      ? rows[0] as { id: string }
      : null

    if ( !row?.id ) {
      return null
    }

    const [ result ] = await conn.query(
      `
      UPDATE VideoTimerVideos
      SET
        compressionStatusId = ?,
        compressionStartedAt = NOW(),
        compressionError = NULL,
        updated = NOW()
      WHERE id = ?
        AND compressionStatusId = ?
      `,
      [
        VIDEO_COMPRESSION_STATUS_IDS.processing,
        row.id,
        VIDEO_COMPRESSION_STATUS_IDS.queued,
      ]
    )

    const affectedRows =
      typeof result === "object" && result && "affectedRows" in result
        ? Number( result.affectedRows )
        : 0

    if ( affectedRows !== 1 ) {
      return null
    }

    return row.id
  } finally {
    conn.release()
  }
}

export const processVideo = async ( videoId: string ) => {
  const conn = await pool.getConnection()
  const tempBase = join( tmpdir(), `video-compress-${videoId}-${randomUUID()}` )
  const inputPath = join( tempBase, "input.mp4" )
  const outputPath = join( tempBase, "output.mp4" )

  try {
    await fs.mkdir( tempBase, { recursive: true } )

    const [ rows ] = await conn.query(
      `
      SELECT
        id,
        playbackUrl,
        uploadKey,
        originalPlaybackUrl,
        originalUploadKey,
        originalName,
        mimeType,
        size,
        compressionStatusId
      FROM VideoTimerVideos
      WHERE id = ?
      LIMIT 1
      `,
      [ videoId ]
    )

    const video = Array.isArray( rows ) ? rows[0] as {
      id: string
      playbackUrl: string | null
      uploadKey: string | null
      originalPlaybackUrl: string | null
      originalUploadKey: string | null
      originalName: string | null
      mimeType: string | null
      size: number | null
      compressionStatusId: number | null
    } : null

    if ( !video ) {
      throw new Error( "Video not found" )
    }

    if ( video.compressionStatusId !== VIDEO_COMPRESSION_STATUS_IDS.processing ) {
      await conn.query(
        `
        UPDATE VideoTimerVideos
        SET
          compressionStatusId = ?,
          compressionStartedAt = NOW(),
          compressionError = NULL,
          updated = NOW()
        WHERE id = ?
        `,
        [
          VIDEO_COMPRESSION_STATUS_IDS.processing,
          videoId,
        ]
      )
    }

    const originalUploadKey = video.originalUploadKey || video.uploadKey
    if ( !originalUploadKey ) {
      throw new Error( "Video does not have originalUploadKey" )
    }

    const object = await s3.send(
      new GetObjectCommand( {
        Bucket: bucket,
        Key: originalUploadKey,
      } )
    )

    if ( !object.Body ) {
      throw new Error( "S3 object body is empty" )
    }

    await pipeline(
      object.Body as NodeJS.ReadableStream,
      createWriteStream( inputPath )
    )

    await runFfmpeg( inputPath, outputPath )

    const stat = await fs.stat( outputPath )
    const compressedUploadKey = `video-timer/compressed/${videoId}.mp4`
    const compressedPlaybackUrl = `${cloudfrontUrl}/${compressedUploadKey}`

    const upload = new Upload( {
      client: s3,
      params: {
        Bucket: bucket,
        Key: compressedUploadKey,
        Body: createReadStream( outputPath ),
        ContentType: "video/mp4",
      },
      leavePartsOnError: false,
    } )

    await upload.done()

    await conn.query(
      `
      UPDATE VideoTimerVideos
      SET
        compressedPlaybackUrl = ?,
        compressedUploadKey = ?,
        compressedSize = ?,
        playbackUrl = ?,
        size = ?,
        mimeType = 'video/mp4',
        compressionStatusId = ?,
        compressionCompletedAt = NOW(),
        updated = NOW()
      WHERE id = ?
      `,
      [
        compressedPlaybackUrl,
        compressedUploadKey,
        stat.size,
        compressedPlaybackUrl,
        stat.size,
        VIDEO_COMPRESSION_STATUS_IDS.completed,
        videoId,
      ]
    )

    console.log( `Compression completed for ${videoId}` )
  } catch ( error ) {
    const message =
      error instanceof Error && error.message
        ? error.message.slice( 0, 2000 )
        : "Compression failed"

    await conn.query(
      `
      UPDATE VideoTimerVideos
      SET
        compressionStatusId = ?,
        compressionError = ?,
        updated = NOW()
      WHERE id = ?
      `,
      [
        VIDEO_COMPRESSION_STATUS_IDS.failed,
        message,
        videoId,
      ]
    )

    throw error
  } finally {
    try {
      await fs.rm( tempBase, { recursive: true, force: true } )
    } catch {
      // Ignore cleanup errors
    }

    conn.release()
  }
}

export const sleep = ( ms: number ) =>
  new Promise<void>( resolve => setTimeout( resolve, ms ) )