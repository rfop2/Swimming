import { getPool, prepareStatement, type Swimmer } from "lib"

export default defineEventHandler( async ( event ) => {
  const token = getRouterParam( event, "token" )
  if ( !token ) {
    throw createError( { status: 400 } )
  }

  const swimmerId = await validateShareToken( token )
  const pool = await getPool()

  const selectSwimmer = prepareStatement<{ swimmerId: string }, Swimmer>(
    pool,
    `SELECT id, fullName, firstName, lastName, birthday, gender, nationality, region, county, active, lastUpdateTime, lastUpdateType
     FROM Swimmers WHERE id = :swimmerId`
  )
  const swimmer = await selectSwimmer.get( { swimmerId } )
  if ( !swimmer ) {
    throw createError( { status: 404 } )
  }
  return swimmer
} )
