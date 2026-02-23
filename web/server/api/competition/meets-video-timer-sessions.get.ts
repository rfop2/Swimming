import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getQuery } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type MeetRow = {
  id: string
  name: string
  date: string
  course: string
  location: string | null
  code: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )

  const q = getQuery( event )
  const course = typeof q.course === "string" && q.course.trim() ? q.course.trim() : null
  const search = typeof q.q === "string" && q.q.trim() ? q.q.trim() : null

  const tokens = ( search ?? "" )
    .trim()
    .toLowerCase()
    .split( /\s+/ )
    .filter( Boolean )
    .slice( 0, 8 )

  const tokenClauses = tokens.map( ( _, i ) =>
    `LOWER(CONCAT_WS(' ', DATE_FORMAT(date, '%Y-%m-%d'), name, COALESCE(location, ''), code)) LIKE :token${i}`
  )

  const searchClause = tokenClauses.length ? `AND ${tokenClauses.join( " AND " )}` : ""

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const stmt = prepareStatement(
      conn,
      `
      SELECT
        id,
        name,
        date,
        course,
        location,
        code
      FROM Meets
      WHERE
        (:course IS NULL OR course = :course)
        AND date <= CURDATE()
        ${searchClause}
      ORDER BY date DESC, name ASC
      LIMIT 200
      `
    )

    const params: Record<string, string | null> = { course }

    tokens.forEach( ( token, i ) => {
      params[`token${i}`] = `%${token}%`
    } )

    const rows = ( await stmt.all( params ) ) as MeetRow[]
    return rows
  } catch ( error ) {
    if ( isMySql2Error( error ) ) throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    throw createError( { status: 500, message: "Unable to load meets" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )