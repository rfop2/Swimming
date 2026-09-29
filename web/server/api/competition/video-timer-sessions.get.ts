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
  status: "draft" | "completed"
  draftData: string | Record<string, unknown> | null
  originalName: string
  markersCount: number
  swimmerId: string | null
  swimmerName: string | null
  resultDate: string | null
  resultName: string | null
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
        s.status as status,
        s.draftData as draftData,
        s.swimmerId as swimmerId,
        sw.fullName as swimmerName,
        r.date as resultDate,
        r.meet as resultName,
        v.originalName as originalName,
        (
          SELECT COUNT(*)
          FROM VideoTimerMarkers m
          WHERE m.sessionId = s.id
        ) as markersCount
      FROM VideoTimerSessions s
      INNER JOIN VideoTimerVideos v ON v.id = s.videoId
      LEFT JOIN Swimmers sw ON sw.id = s.swimmerId
      LEFT JOIN Results r
        ON r.swimmer = s.resultSwimmer
        AND r.course = s.resultCourse
        AND r.stroke = s.resultStroke
        AND r.distance = s.resultDistance
        AND r.seq = s.resultSeq
      WHERE s.userId = :userId
      ORDER BY
        r.date IS NULL ASC,
        r.date DESC,
        s.created DESC
      LIMIT 200
      `
    )

    const rows = ( await stmt.all( { userId } ) ) as Row[]

    return rows.map( r => {
      let draft: Record<string, unknown> | null = null
      try {
        draft = typeof r.draftData === "string" ? JSON.parse( r.draftData ) as Record<string, unknown> : r.draftData
      } catch {
        draft = null
      }

      const finishVideoMs = typeof draft?.finishVideoMs === "number" ? draft.finishVideoMs : null
      const surfaceSlots = Array.isArray( draft?.surfaceSlots ) ? draft.surfaceSlots : []
      const splitSlots = Array.isArray( draft?.splitSlots ) ? draft.splitSlots : []
      const plannedSlots = [ ...surfaceSlots, ...splitSlots ] as Array<{ videoMs?: unknown }>
      const placedMarkers = plannedSlots.filter( slot => typeof slot?.videoMs === "number" ).length

      return {
        id: r.id,
        createdAt: r.created,
        status: r.status,
        finishMarked: finishVideoMs !== null,
        markerProgress: {
          placed: placedMarkers,
          total: plannedSlots.length,
        },
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
      }
    } )
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
