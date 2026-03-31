import { getPool, prepareStatement, type PerformanceRow } from "lib"

export default defineEventHandler( async ( event ) => {
  const token = getRouterParam( event, "token" )
  if ( !token ) {
    throw createError( { status: 400 } )
  }

  const swimmerId = await validateShareToken( token )
  const pool = await getPool()

  const selectRecords = prepareStatement<{ id: string }, PerformanceRow>(
    pool,
    "SELECT * FROM Performance WHERE swimmer = :id"
  )
  return selectRecords.all( { id: swimmerId } )
} )
