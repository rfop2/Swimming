import { defineEventHandler } from "h3"
import { getPool, prepareStatement } from "lib"
import type { User } from "lucia"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user?.admin ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const selectRecords = prepareStatement<unknown[],User>(
    await getPool(),
    "SELECT id, username, firstName, lastName, location, type, admin, created, updated FROM User"
  )
  const data = await selectRecords.all()
  return data
} )
