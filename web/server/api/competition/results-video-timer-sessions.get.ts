import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getQuery } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type ResultRow = {
  swimmer: string
  course: string
  stroke: string
  distance: string
  seq: number
  date: string
  meet: string
  round: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )

  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const q = getQuery( event )

  const swimmerId = typeof q.swimmerId === "string" && q.swimmerId.trim() ? q.swimmerId.trim() : null
  const course = typeof q.course === "string" && q.course.trim() ? q.course.trim() : null
  const stroke = typeof q.stroke === "string" && q.stroke.trim() ? q.stroke.trim() : null
  const distance = typeof q.distance === "string" && q.distance.trim() ? q.distance.trim() : null
  const search = typeof q.q === "string" && q.q.trim() ? q.q.trim() : null

  if ( !swimmerId || !course || !stroke || !distance ) {
    return []
  }

  const tokens = ( search ?? "" )
    .trim()
    .toLowerCase()
    .split( /\s+/ )
    .filter( Boolean )
    .slice( 0, 8 )

  const tokenClauses = tokens.map( ( _, i ) =>
    `LOWER(CONCAT_WS(' ', DATE_FORMAT(r.date, '%Y-%m-%d'), r.meet, r.round, r.seq)) LIKE :token${i}`
  )

  const searchClause = tokenClauses.length ? `AND ${tokenClauses.join( " AND " )}` : ""

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const stmt = prepareStatement(
      conn,
      `
      SELECT
        r.swimmer,
        r.course,
        r.stroke,
        r.distance,
        r.seq,
        r.date,
        r.meet,
        r.round
      FROM Results r
      WHERE
        r.swimmer = :swimmerId
        AND r.course = :course
        AND r.stroke = :stroke
        AND r.distance = :distance
        AND NOT EXISTS (
          SELECT 1
          FROM VideoTimerSessions s
          WHERE s.userId = :userId
            AND s.resultSwimmer = r.swimmer
            AND s.resultCourse = r.course
            AND s.resultStroke = r.stroke
            AND s.resultDistance = r.distance
            AND s.resultSeq = r.seq
        )
        ${searchClause}
      ORDER BY
        ABS(DATEDIFF(r.date, CURDATE())) ASC,
        r.date DESC,
        r.seq DESC
      LIMIT 200
      `
    )

    const params: Record<string, string | null> = {
      userId,
      swimmerId,
      course,
      stroke,
      distance,
    }

    tokens.forEach( ( token, i ) => {
      params[`token${i}`] = `%${token}%`
    } )

    const rows = ( await stmt.all( params ) ) as ResultRow[]
    return rows
  } catch ( error ) {
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw createError( { status: 500, message: "Unable to load results" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )