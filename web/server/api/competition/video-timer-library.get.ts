import type { PoolConnection } from "lib"
import { createError, defineEventHandler } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type Row = {
  id: string
  created: string
  playbackUrl: string
  originalName: string
  mimeType: string
  size: number
  durationMs: number | null
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )

  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const stmt = prepareStatement(
      conn,
      `
      SELECT
        v.id as id,
        v.created as created,
        v.playbackUrl as playbackUrl,
        v.originalName as originalName,
        v.mimeType as mimeType,
        v.size as size,
        v.durationMs as durationMs
      FROM VideoTimerVideos v
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

    return rows.map( r => ( {
      id: r.id,
      createdAt: r.created,
      playbackUrl: r.playbackUrl,
      originalName: r.originalName,
      mimeType: r.mimeType,
      size: Number( r.size ) || 0,
      durationMs: r.durationMs === null ? null : Number( r.durationMs ),
      sessionId: null,
      swimmerId: null,
      swimmerName: null,
      course: null,
      stroke: null,
      distance: null,
      meetName: null,
      meetDate: null,
    } ) )
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