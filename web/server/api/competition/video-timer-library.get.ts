import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getQuery } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type Row = {
  id: string
  created: string
  playbackUrl: string
  originalName: string
  mimeType: string
  size: number
  durationMs: number | null
  sessionId: string | null
  swimmerId: string | null
  swimmerName: string | null
  course: string | null
  stroke: string | null
  distance: string | null  
  meetName: string | null
  meetDate: string | null
  resultDate: string | null
  resultMeetName: string | null
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )

  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const query = getQuery( event )
  const status = typeof query.status === "string" ? query.status.trim() : ""

  const statusSql =
    status === "available"
      ? "AND s.id IS NULL"
      : status === "linked"
        ? "AND s.id IS NOT NULL"
        : ""

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
        v.durationMs as durationMs,
        s.id as sessionId,
        s.swimmerId as swimmerId,
        sw.fullName as swimmerName,
        s.course as course,
        s.stroke as stroke,
        s.distance as distance,
        r.date as resultDate,
        r.meet as resultMeetName
      FROM VideoTimerVideos v
      LEFT JOIN VideoTimerSessions s
        ON s.videoId = v.id
        AND s.userId = v.userId
      LEFT JOIN Swimmers sw
        ON sw.id = s.swimmerId
      LEFT JOIN Results r
        ON r.swimmer = s.resultSwimmer
        AND r.course = s.resultCourse
        AND r.stroke = s.resultStroke
        AND r.distance = s.resultDistance
        AND r.seq = s.resultSeq
      WHERE v.userId = :userId
      ${statusSql}
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
      sessionId: r.sessionId ?? null,
      swimmerId: r.swimmerId ?? null,
      swimmerName: r.swimmerName ?? null,
      course: r.course ?? null,
      stroke: r.stroke ?? null,
      distance: r.distance ?? null,
      meetName: r.resultMeetName ?? r.meetName ?? null,
      meetDate: r.resultDate ?? r.meetDate ?? null,
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