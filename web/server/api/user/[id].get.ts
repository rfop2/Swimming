import { getPool, prepareStatement, parseUserAttributes } from "lib"
import type { User } from "lucia"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const userId = getRouterParam( event, "id" )
  if ( !userId || event.context.user.role !== "admin" ) {
    throw createError( {
      status: 403
    } )
  }

  const selectUser = prepareStatement<{ userId: string }, User>(
    await getPool(),
    "SELECT id, username, firstName, lastName, phone, location, locationId, role, attributes, created, updated FROM User WHERE id = :userId"
  )
  const data = await selectUser.get( { userId } )
  if ( data ) {
    data.attributes = parseUserAttributes( data.attributes )
  }
  return data
} )
