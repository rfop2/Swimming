import type { PoolConnection } from "lib"
import { createError, defineEventHandler } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type Row = {
  id: string
  created: string
  updated: string | null
  playbackUrl: string
  originalName: string
  mimeType: string
  size: number
  durationMs: number | null
  compressionStatusId: number | null
  compressionStatusCode: string | null
  compressionStatusName: string | null
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )

  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  const VIDEO_COMPRESSION_STATUS_IDS = {
    none: 1,
    pending: 2,
    queued: 3,
    processing: 4,
    completed: 5,
    failed: 6,
  } as const

  try {
    const stmt = prepareStatement(
      conn,
      `
      SELECT
        v.id as id,
        v.created as created,
        v.updated as updated,
        v.playbackUrl as playbackUrl,
        v.originalName as originalName,
        v.mimeType as mimeType,
        v.size as size,
        v.durationMs as durationMs,
        v.compressionStatusId as compressionStatusId,
        cs.code as compressionStatusCode,
        cs.name as compressionStatusName
      FROM VideoTimerVideos v
      LEFT JOIN VideoTimerVideoCompressionStatuses cs
        ON cs.id = v.compressionStatusId
      WHERE v.userId = :userId
        AND NOT EXISTS (
          SELECT 1
          FROM VideoTimerSessions s
          WHERE s.videoId = v.id
            AND s.userId = :userId
        )
      ORDER BY v.created DESC
      LIMIT 500
      `
    )

    const rows = ( await stmt.all( { userId } ) ) as Row[]

    return rows.map( row => {
      const isCompressionReady =
        row.compressionStatusId === VIDEO_COMPRESSION_STATUS_IDS.none
        || row.compressionStatusId === VIDEO_COMPRESSION_STATUS_IDS.completed

      return {
        id: row.id,
        createdAt: row.created,
        updatedAt: row.updated,
        playbackUrl: row.playbackUrl,
        originalName: row.originalName,
        mimeType: row.mimeType,
        size: Number( row.size ) || 0,
        durationMs: row.durationMs === null ? null : Number( row.durationMs ),
        sessionId: null,
        compressionStatusId: row.compressionStatusId === null ? null : Number( row.compressionStatusId ),
        compressionStatusCode: row.compressionStatusCode || null,
        compressionStatusName: row.compressionStatusName || null,
        isCompressionReady,
        canCreateSession: isCompressionReady,
      }
    } )
  } catch ( error ) {
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw createError( { status: 500, message: "Unable to load video timer library" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )