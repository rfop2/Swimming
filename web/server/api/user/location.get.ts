import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  if ( !event.context.user.locationId ) {
    return null
  }

  const selectLocation = prepareStatement<{ locationId: number }, { latitude: number, longitude: number }>(
    await getPool(),
    "SELECT latitude, longitude FROM Locations WHERE locationId = :locationId"
  )

  const location = await selectLocation.get( { locationId: event.context.user.locationId } )

  return location ?? null
} )
