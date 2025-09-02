import { defineEventHandler } from "h3"
import { getPool, prepareStatement, type Swimmer } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const selectRecords = prepareStatement<{ userId: string },Swimmer>(
    await getPool(),
    "SELECT id, name, birthday, gender, nationality, region, county, active FROM UserSwimmersView WHERE userId = :userId AND active = 1"
  )
  const data = await selectRecords.all( { userId: event.context.session.userId } )
  return data
} )
