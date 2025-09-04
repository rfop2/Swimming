import { defineEventHandler } from "h3"
import { getPool, prepareStatement, type PerformanceRow } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const id = getRouterParam( event, "id" )
  if ( !id ) {
    throw createError( {
      message: "No swimmer id supplied",
      status: 403,
    } )
  }

  const pool = await getPool()

  const selectMaxCreated = prepareStatement<{ id: string }, { MaxCreated: string }>(
    pool,
    "SELECT MAX(created) AS MaxCreated FROM Performance WHERE swimmer = :id"
  )
  const result = await selectMaxCreated.get( { id } )
  if ( !result?.MaxCreated ) {
    throw createError( { status: 404, statusText: "No records found"} )
  }
  const selectRecords = prepareStatement<{ id: string, date: string }, PerformanceRow>(
    pool,
    "SELECT * FROM Performance WHERE swimmer = :id AND created = :date"
  )
  const data = await selectRecords.all( { id, date: result.MaxCreated } )
  return data
} )
