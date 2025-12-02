import { getPool, prepareStatement, type PerformanceRow } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      status: 401
    } )
  }

  const id = getRouterParam( event, "id" )
  if ( !id ) {
    throw createError( {
      message: "No swimmer id supplied",
      status: 400,
    } )
  }

  const pool = await getPool()

  const selectRecords = prepareStatement<{ id: string }, PerformanceRow>(
    pool,
    "SELECT * FROM Performance WHERE swimmer = :id"
  )
  const data = await selectRecords.all( { id } )
  return data
} )
