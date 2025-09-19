import { defineEventHandler } from "h3"
import { type Club, getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 403
    } )
  }

  const selectRecords = prepareStatement<unknown, Club>(
    await getPool(),
    "SELECT * FROM Clubs ORDER BY ClubName ASC"
  )
  const data = await selectRecords.all()
  return data
} )
