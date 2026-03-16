import type { PoolConnection } from "lib"
import Busboy from "busboy"
import { createError, defineEventHandler } from "h3"
import { extname } from "node:path"
import { randomUUID } from "node:crypto"
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { getPool, isMySql2Error, prepareStatement } from "lib"

const getRequiredEnv = ( name: string ) => {
  const value = process.env[name]?.trim()
  if ( !value ) {
    throw createError( { statusCode: 500, statusMessage: `Missing env: ${name}` } )
  }
  return value
}

const getS3Client = () =>
  new S3Client( {
    region: getRequiredEnv( "AWS_REGION" ),
    credentials: {
      accessKeyId: getRequiredEnv( "AWS_ACCESS_KEY_ID" ),
      secretAccessKey: getRequiredEnv( "AWS_SECRET_ACCESS_KEY" ),
    },
  } )

type UploadResult = {
  id: string
  playbackUrl: string
  originalName: string
  mimeType: string
  size: number
  durationMs: null
  uploadKey: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { status: 401 } )
  }

  const userId = event.context.user.id
  if ( !userId ) {
    throw createError( { status: 401 } )
  }

  const req = event.node.req
  const contentType = String( req.headers["content-type"] || "" )

  if ( !contentType.includes( "multipart/form-data" ) ) {
    throw createError( { statusCode: 415, statusMessage: "Expected multipart/form-data" } )
  }

  const bucket = getRequiredEnv( "AWS_S3_BUCKET" )
  const cloudfrontUrl = getRequiredEnv( "AWS_CLOUDFRONT_URL" ).replace( /\/+$/, "" )
  const s3 = getS3Client()
  const maxBytes = 700 * 1024 * 1024
  const id = randomUUID()

  const result = await new Promise<UploadResult>( ( resolve, reject ) => {
    const bb = Busboy( {
      headers: req.headers,
      limits: { files: 1, fileSize: maxBytes },
    } )

    let gotFile = false
    let ended = false
    let uploadPromise: Promise<unknown> | null = null
    let uploadKey = ""
    let activeUpload: Upload | null = null
    let originalName = ""
    let mimeType = ""
    let size = 0

    const fail = ( statusCode: number, statusMessage: string ) => {
      if ( ended ) return
      ended = true
      if ( activeUpload ) {
        void activeUpload.abort()
      }
      reject( createError( { statusCode, statusMessage } ) )
    }

    bb.on( "file", ( field, file, info: { filename: string; mimeType: string } ) => {
      if ( field !== "video" ) {
        file.resume()
        return
      }

      gotFile = true

      originalName = String( info.filename || "" ).trim()
      mimeType = String( info.mimeType || "" ).trim()

      if ( !mimeType.startsWith( "video/" ) ) {
        file.resume()
        fail( 415, "Invalid file type" )
        return
      }

      const safeExt = extname( originalName ) || ".mp4"
      uploadKey = `video-timer/${id}${safeExt}`

      file.on( "data", ( chunk: Buffer ) => {
        size += chunk.length
      } )

      file.on( "limit", () => fail( 413, "File too large" ) )
      file.on( "error", () => fail( 500, "Upload stream error" ) )

      activeUpload = new Upload( {
        client: s3,
        params: {
          Bucket: bucket,
          Key: uploadKey,
          Body: file,
          ContentType: mimeType,
        },
        leavePartsOnError: false,
      } )

      uploadPromise = activeUpload.done()
    } )

    bb.on( "error", () => fail( 400, "Malformed multipart data" ) )

    bb.on( "finish", () => {
      if ( ended ) return

      if ( !gotFile ) {
        fail( 400, "Missing video field" )
        return
      }

      const done = uploadPromise ?? Promise.resolve()

      done
        .then( () => {
          if ( ended ) return
          ended = true

          resolve( {
            id,
            playbackUrl: `${cloudfrontUrl}/${uploadKey}`,
            originalName,
            mimeType,
            size,
            durationMs: null,
            uploadKey,
          } )
        } )
        .catch( () => fail( 500, "S3 upload error" ) )
    } )

    req.pipe( bb )
  } )

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const insertVideo = prepareStatement(
      conn,
      `
      INSERT INTO VideoTimerVideos (
        id,
        userId,
        playbackUrl,
        originalName,
        mimeType,
        size,
        durationMs
      )
      VALUES (
        :id,
        :userId,
        :playbackUrl,
        :originalName,
        :mimeType,
        :size,
        :durationMs
      )
      `
    )

    await insertVideo.run( {
      id: result.id,
      userId,
      playbackUrl: result.playbackUrl,
      originalName: result.originalName,
      mimeType: result.mimeType,
      size: result.size,
      durationMs: result.durationMs,
    } )

    return {
      id: result.id,
      playbackUrl: result.playbackUrl,
      originalName: result.originalName,
      mimeType: result.mimeType,
      size: result.size,
      durationMs: result.durationMs,
    }
  } catch ( error ) {
    try {
      await s3.send(
        new DeleteObjectCommand( {
          Bucket: bucket,
          Key: result.uploadKey,
        } )
      )
    } catch ( cleanupError ) {
      void cleanupError
    }

    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw createError( { status: 500, message: "Unable to save uploaded video" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )