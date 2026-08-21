import type { PoolConnection } from "lib"
import { createError, defineEventHandler } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type Row = {
  id: string
  shareId: string
  created: string
  course: string
  stroke: string
  distance: string
  notes: string | null
  originalName: string
  markersCount: number
  swimmerId: string | null
  swimmerName: string | null
  resultDate: string | null
  resultName: string | null
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )
  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const stmt = prepareStatement<{ userId: string }, Row>(
      conn,
      `
      SELECT
        s.id as id,
        sh.id as shareId,
        s.created as created,
        s.course as course,
        s.stroke as stroke,
        s.distance as distance,
        s.notes as notes,
        s.swimmerId as swimmerId,
        sw.fullName as swimmerName,
        r.date as resultDate,
        r.meet as resultName,
        v.originalName as originalName,
        owner.firstName as ownerFirstName,
        owner.lastName as ownerLastName,
        owner.username as ownerEmail,
        (
          SELECT COUNT(*)
          FROM VideoTimerMarkers m
          WHERE m.sessionId = s.id
        ) as markersCount
      FROM VideoTimerSessionShares sh
      INNER JOIN VideoTimerSessions s ON s.id = sh.sessionId
      INNER JOIN VideoTimerVideos v ON v.id = s.videoId
      INNER JOIN User owner ON owner.id = sh.ownerId
      LEFT JOIN Swimmers sw ON sw.id = s.swimmerId
      LEFT JOIN Results r
        ON r.swimmer = s.resultSwimmer
        AND r.course = s.resultCourse
        AND r.stroke = s.resultStroke
        AND r.distance = s.resultDistance
        AND r.seq = s.resultSeq
      WHERE sh.sharedWithUserId = :userId
      ORDER BY
        r.date IS NULL ASC,
        r.date DESC,
        s.created DESC
      LIMIT 200
      `
    )

    const rows = await stmt.all( { userId } )

    return rows.map( r => ( {
      id: r.id,
      shareId: r.shareId,
      createdAt: r.created,
      swimmerId: r.swimmerId ?? null,
      swimmerName: r.swimmerName ?? null,
      course: r.course ?? null,
      stroke: r.stroke ?? null,
      distance: r.distance ?? null,
      notes: r.notes,
      markersCount: Number( r.markersCount ) || 0,
      videoOriginalName: r.originalName ?? null,
      resultName: r.resultName ?? null,
      resultDate: r.resultDate ?? null,
      ownerName: `${r.ownerFirstName} ${r.ownerLastName}`.trim(),
      ownerEmail: r.ownerEmail,
    } ) )
  } catch ( error ) {
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw createError( { status: 500, message: "Unable to load shared video timer sessions" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )
