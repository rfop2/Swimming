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
    "SELECT id, fullName, firstName, middleName, lastName, birthday, gender, nationality, region, county, squad, active FROM Swimmers INNER JOIN UserSwimmers ON(Swimmers.id = UserSwimmers.swimmerId) WHERE UserSwimmers.userId = :userId"
  )
  const data = await selectRecords.all( { userId: event.context.session.userId } )
  return data
} )
