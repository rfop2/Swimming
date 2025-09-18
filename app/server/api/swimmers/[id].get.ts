import { defineEventHandler } from "h3"
import { getPool, prepareStatement, type Swimmer } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const userId = getRouterParam( event, "id" )
  if ( userId && !Number( event.context.user.admin ) ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const selectRecords = prepareStatement<{ userId: string }, Swimmer>(
    await getPool(),
    "SELECT id, fullName, firstName, middleName, lastName, birthday, gender, nationality, region, county, squad, active, updateStatus, updateType, lastUpdateTime, lastUpdateType FROM Swimmers INNER JOIN UserSwimmers ON(Swimmers.id = UserSwimmers.swimmerId) WHERE UserSwimmers.userId = :userId"
  )
  const data = await selectRecords.all( { userId: userId ?? event.context.session.userId } )
  return data
} )
