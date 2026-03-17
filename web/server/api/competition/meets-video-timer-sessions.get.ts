import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getQuery } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type MeetRow = {
  id: string
  name: string
  date: string
  duration: number
  course: string
  location: string | null
  code: string
}

const isIsoDate = ( value: string ) => /^\d{4}-\d{2}-\d{2}$/.test( value )

const shiftIsoDate = ( value: string, days: number ) => {
  const [ year, month, day ] = value.split( "-" ).map( Number )
  const date = new Date( Date.UTC( year, month - 1, day ) )
  date.setUTCDate( date.getUTCDate() + days )

  const y = date.getUTCFullYear()
  const m = String( date.getUTCMonth() + 1 ).padStart( 2, "0" )
  const d = String( date.getUTCDate() ).padStart( 2, "0" )

  return `${y}-${m}-${d}`
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )

  const q = getQuery( event )
  const course = typeof q.course === "string" && q.course.trim() ? q.course.trim() : null
  const search = typeof q.q === "string" && q.q.trim() ? q.q.trim() : null
  const hintDateRaw = typeof q.hintDate === "string" && q.hintDate.trim() ? q.hintDate.trim() : null

  const hintDate = hintDateRaw && isIsoDate( hintDateRaw ) ? hintDateRaw : null
  const hintDateStart = hintDate ? shiftIsoDate( hintDate, -1 ) : null
  const hintDateEnd = hintDate ? shiftIsoDate( hintDate, 1 ) : null

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

  const dateClause = hintDateStart && hintDateEnd
    ? `
      AND DATE_ADD(date, INTERVAL GREATEST(duration, 1) - 1 DAY) >= :hintDateStart
      AND date <= :hintDateEnd
    `
    : `
      AND date <= CURDATE()
    `

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
        duration,
        course,
        location,
        code
      FROM Meets
      WHERE
        (:course IS NULL OR course = :course)
        ${dateClause}
        ${searchClause}
      ORDER BY date DESC, name ASC
      LIMIT 200
      `
    )

    const params: Record<string, string | null> = {
      course,
      hintDateStart,
      hintDateEnd,
    }

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