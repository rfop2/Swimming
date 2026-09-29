import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getQuery, getRouterParam } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type Row = {
  sessionId: string
  createdAt: string
  resultDate: string | null
  resultName: string | null
  swimmerId: string | null
  swimmerName: string | null
  course: string
  stroke: string
  distance: string
  officialFinishMs: number | null
  totalStrokeCount: number | null
  averageStrokeCount: number | null
  breakoutStartM: number | null
  averageTurnBreakoutM: number | null
  markerCount: number | null
}

export default defineEventHandler( async event => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { status: 401 } )
  }

  const userId = event.context.user.id
  if ( !userId ) {
    throw createError( { status: 401 } )
  }

  const swimmerId = String( getRouterParam( event, "id" ) ?? "" ).trim()
  if ( !swimmerId ) {
    throw createError( { status: 400, message: "Missing swimmer id." } )
  }

  const q = getQuery( event )

  const course = typeof q.course === "string" && q.course.trim() ? q.course.trim() : null
  const stroke = typeof q.stroke === "string" && q.stroke.trim() ? q.stroke.trim() : null
  const distance = typeof q.distance === "string" && q.distance.trim() ? q.distance.trim() : null
  const startDate = typeof q.startDate === "string" && q.startDate.trim() ? q.startDate.trim() : null
  const endDate = typeof q.endDate === "string" && q.endDate.trim() ? q.endDate.trim() : null

  if ( !course || !distance ) {
    return []
  }

  const strokeClause = stroke ? "AND s.stroke = :stroke" : ""
  const startDateClause = startDate ? "AND DATE(COALESCE(r.date, s.created)) >= :startDate" : ""
  const endDateClause = endDate ? "AND DATE(COALESCE(r.date, s.created)) <= :endDate" : ""

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const stmt = prepareStatement(
      conn,
      `
      SELECT
        s.id as sessionId,
        s.created as createdAt,
        r.date as resultDate,
        r.meet as resultName,
        COALESCE(s.swimmerId, s.resultSwimmer) as swimmerId,
        sw.fullName as swimmerName,
        s.course as course,
        s.stroke as stroke,
        s.distance as distance,
        COALESCE(s.officialFinishMs, ROUND(r.time * 1000)) as officialFinishMs,
        a.breakoutStartM as breakoutStartM,
        sc.totalStrokeCount as totalStrokeCount,
        sc.averageStrokeCount as averageStrokeCount,
        tr.averageTurnBreakoutM as averageTurnBreakoutM,
        mk.markerCount as markerCount
      FROM VideoTimerSessions s
      LEFT JOIN Swimmers sw
        ON sw.id = COALESCE(s.swimmerId, s.resultSwimmer)
      LEFT JOIN Results r
        ON r.swimmer = s.resultSwimmer
        AND r.course = s.resultCourse
        AND r.stroke = s.resultStroke
        AND r.distance = s.resultDistance
        AND r.seq = s.resultSeq
      LEFT JOIN VideoTimerSessionAnalysis a
        ON a.sessionId = s.id
      LEFT JOIN (
        SELECT
          sessionId,
          SUM(count) as totalStrokeCount,
          AVG(count) as averageStrokeCount
        FROM VideoTimerSessionStrokeCounts
        WHERE count IS NOT NULL
        GROUP BY sessionId
      ) sc
        ON sc.sessionId = s.id
      LEFT JOIN (
        SELECT
          sessionId,
          AVG(breakoutM) as averageTurnBreakoutM
        FROM VideoTimerSessionTurns
        WHERE breakoutM IS NOT NULL
        GROUP BY sessionId
      ) tr
        ON tr.sessionId = s.id
      LEFT JOIN (
        SELECT
          sessionId,
          COUNT(*) as markerCount
        FROM VideoTimerMarkers
        GROUP BY sessionId
      ) mk
        ON mk.sessionId = s.id
      WHERE s.userId = :userId
        AND s.status = 'completed'
        AND COALESCE(s.swimmerId, s.resultSwimmer) = :swimmerId
        AND s.course = :course
        AND s.distance = :distance
        ${strokeClause}
        ${startDateClause}
        ${endDateClause}
      ORDER BY
        COALESCE(r.date, DATE(s.created)) DESC,
        s.created DESC
      LIMIT 500
      `
    )

    const params: Record<string, string> = {
      userId,
      swimmerId,
      course,
      distance,
    }

    if ( stroke ) {
      params.stroke = stroke
    }

    if ( startDate ) {
      params.startDate = startDate
    }

    if ( endDate ) {
      params.endDate = endDate
    }

    const rows = ( await stmt.all( params ) ) as Row[]

    return rows.map( row => ( {
      sessionId: row.sessionId,
      createdAt: row.createdAt,
      resultDate: row.resultDate,
      resultName: row.resultName,
      swimmerId: row.swimmerId,
      swimmerName: row.swimmerName,
      course: row.course,
      stroke: row.stroke,
      distance: row.distance,
      officialFinishMs: row.officialFinishMs === null ? null : Number( row.officialFinishMs ),
      totalStrokeCount: row.totalStrokeCount === null ? null : Number( row.totalStrokeCount ),
      averageStrokeCount: row.averageStrokeCount === null ? null : Number( row.averageStrokeCount ),
      breakoutStartM: row.breakoutStartM === null ? null : Number( row.breakoutStartM ),
      averageTurnBreakoutM: row.averageTurnBreakoutM === null ? null : Number( row.averageTurnBreakoutM ),
      markerCount: Number( row.markerCount ?? 0 ),
    } ) )
  } catch ( error ) {
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw createError( { status: 500, message: "Unable to load video timer history." } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )
