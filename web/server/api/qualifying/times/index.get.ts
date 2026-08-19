import { getPool, prepareStatement, type QualifyingRow } from "lib"

// Splits a comma-separated query value (or array of them, if repeated) into a
// clean list of trimmed, non-empty strings. Returns [] if the param wasn't given.
const parseListParam = ( value: unknown ): string[] => {
  const raw = Array.isArray( value ) ? value.join( "," ) : typeof value === "string" ? value : ""
  return raw.split( "," ).map( v => v.trim() ).filter( Boolean )
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const query = getQuery( event )
  const years = parseListParam( query.year ).map( Number ).filter( n => !Number.isNaN( n ) )
  const strokes = parseListParam( query.stroke )

  const conditions: string[] = []
  const params: Record<string, string | number> = {}

  if ( years.length ) {
    conditions.push( `year IN (${years.map( ( _, i ) => `:year${i}` ).join( ", " )})` )
    years.forEach( ( y, i ) => {
      params[`year${i}`] = y 
    } )
  }
  if ( strokes.length ) {
    conditions.push( `stroke IN (${strokes.map( ( _, i ) => `:stroke${i}` ).join( ", " )})` )
    strokes.forEach( ( s, i ) => {
      params[`stroke${i}`] = s 
    } )
  }

  const sql = `SELECT * FROM QualifyingTimes${conditions.length ? ` WHERE ${conditions.join( " AND " )}` : ""}`

  const selectRecords = prepareStatement<Record<string, string | number>, QualifyingRow>(
    await getPool(),
    sql
  )

  return selectRecords.all( params )
} )
