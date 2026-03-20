import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getRouterParam } from "h3"
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getPool, isMySql2Error } from "lib"

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

const getUploadKeyFromPlaybackUrl = ( playbackUrl: string ) => {
  try {
    const url = new URL( String( playbackUrl || "" ).trim() )
    return decodeURIComponent( url.pathname.replace( /^\/+/, "" ) )
  } catch {
    return ""
  }
}

type VideoRow = {
  id: string
  playbackUrl: string
  originalName: string
}

type SessionRow = {
  id: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { statusCode: 401, statusMessage: "Unauthorized" } )
  }

  const userId = String( event.context.user.id || "" ).trim()
  if ( !userId ) {
    throw createError( { statusCode: 401, statusMessage: "Unauthorized" } )
  }

  const videoId = String( getRouterParam( event, "id" ) || "" ).trim()
  if ( !videoId ) {
    throw createError( { statusCode: 400, statusMessage: "Missing video id" } )
  }

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const [ videoRows ] = await conn.query(
      `
      SELECT
        id,
        playbackUrl,
        originalName
      FROM VideoTimerVideos
      WHERE id = ?
        AND userId = ?
      LIMIT 1
      `,
      [ videoId, userId ]
    ) as [ VideoRow[], unknown ]

    const existingVideo = videoRows[0] ?? null

    if ( !existingVideo ) {
      throw createError( { statusCode: 404, statusMessage: "Video not found" } )
    }

    const [ sessionRows ] = await conn.query(
      `
      SELECT id
      FROM VideoTimerSessions
      WHERE videoId = ?
        AND userId = ?
      LIMIT 1
      `,
      [ videoId, userId ]
    ) as [ SessionRow[], unknown ]

    const linkedSession = sessionRows[0] ?? null

    if ( linkedSession ) {
      throw createError( {
        statusCode: 409,
        statusMessage: "This video is already linked to a session and cannot be deleted",
      } )
    }

    const bucket = getRequiredEnv( "AWS_S3_BUCKET" )
    const uploadKey = getUploadKeyFromPlaybackUrl( String( existingVideo.playbackUrl || "" ) )

    if ( !uploadKey ) {
      throw createError( {
        statusCode: 500,
        statusMessage: "Unable to resolve S3 object key for this video",
      } )
    }

    const s3 = getS3Client()

    await s3.send(
      new DeleteObjectCommand( {
        Bucket: bucket,
        Key: uploadKey,
      } )
    )

    await conn.query(
      `
      DELETE FROM VideoTimerVideos
      WHERE id = ?
        AND userId = ?
      LIMIT 1
      `,
      [ videoId, userId ]
    )

    return {
      ok: true,
      id: videoId,
    }
  } catch ( error ) {
    if ( ( error as { statusCode?: number } )?.statusCode ) {
      throw error
    }

    if ( isMySql2Error( error ) ) {
      throw createError( {
        statusCode: 500,
        statusMessage: `Database error: ${error.sqlMessage}`,
      } )
    }

    throw createError( {
      statusCode: 500,
      statusMessage: error instanceof Error
        ? error.message
        : "Unable to delete video",
    } )
  } finally {
    try {
      conn.release()
    } catch {
      // ignore
    }
  }
} )