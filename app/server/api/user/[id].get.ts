import { defineEventHandler } from "h3"
import { getPool, prepareStatement } from "lib"
import type { User } from "lucia"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const userId = getRouterParam( event, "id" )
  if ( !userId || !Number( event.context.user.admin ) ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const selectRecords = prepareStatement<{ userId: string },User>(
    await getPool(),
    "SELECT id, username, firstName, lastName, location, type, admin, created, updated FROM User WHERE id = :userId"
  )
  const data = await selectRecords.get( { userId } )
  return data
} )
