import { getPool, prepareStatement } from "lib"
import type { User } from "lucia"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const userId = getRouterParam( event, "id" )
  if ( userId && !Number( event.context.user.admin ) ) {
    throw createError( {
      status: 403
    } )
  }

  const selectRecords = prepareStatement<unknown[], User>(
    await getPool(),
    "SELECT id, username, firstName, lastName, location, type, admin, created, updated FROM User"
  )
  const data = await selectRecords.all()
  return data
} )
