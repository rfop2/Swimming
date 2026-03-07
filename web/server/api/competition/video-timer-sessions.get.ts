import type { PoolConnection } from "lib"
import { createError, defineEventHandler } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type Row = {
  id: string
  created: string
  course: string
  stroke: string
  distance: string
  notes: string | null
  originalName: string
  markersCount: number
  swimmerId: string | null
  swimmerName: string | null
  meetId: string | null
  meetName: string | null
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
        s.id as id,
        s.created as created,
        s.course as course,
        s.stroke as stroke,
        s.distance as distance,
        s.notes as notes,
        s.swimmerId as swimmerId,
        sw.fullName as swimmerName,
        s.meetId as meetId,
        mt.name as meetName,
        v.originalName as originalName,
        (
          SELECT COUNT(*)
          FROM VideoTimerMarkers m
          WHERE m.sessionId = s.id
        ) as markersCount
      FROM VideoTimerSessions s
      INNER JOIN VideoTimerVideos v ON v.id = s.videoId
      LEFT JOIN Swimmers sw ON sw.id = s.swimmerId
      LEFT JOIN Meets mt ON mt.id = s.meetId
      WHERE s.userId = :userId
      ORDER BY s.created DESC
      LIMIT 200
      `
    )

    const rows = ( await stmt.all( { userId } ) ) as Row[]

    return rows.map( ( r ) => ( {
      id: r.id,
      createdAt: r.created,
      swimmerName: r.swimmerName ?? null,
      course: r.course ?? null,
      stroke: r.stroke ?? null,
      distance: r.distance ?? null,
      notes: r.notes,
      markersCount: Number( r.markersCount ) || 0,
      videoOriginalName: r.originalName ?? null,
    } ) )
  } catch ( error ) {
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }
    throw createError( { status: 500, message: "Unable to load video timer sessions" } )
  } finally {
    try {
      conn.release() 
    } catch ( err ) {
      void err 
    }
  }
} )
