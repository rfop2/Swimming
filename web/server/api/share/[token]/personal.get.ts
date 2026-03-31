import { getPool, prepareStatement, type IndividualRow } from "lib"

export default defineEventHandler( async ( event ) => {
  const token = getRouterParam( event, "token" )
  if ( !token ) {
    throw createError( { status: 400 } )
  }

  const swimmerId = await validateShareToken( token )
  const pool = await getPool()

  const selectRecords = prepareStatement<{ swimmerId: string }, IndividualRow>(
    pool,
    "SELECT * FROM Individual WHERE swimmer = :swimmerId ORDER BY course DESC, stroke ASC, distance ASC"
  )
  return selectRecords.all( { swimmerId } )
} )
