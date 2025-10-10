import { defineEventHandler } from "h3"
import { getPool, prepareStatement, type Update } from "lib"

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

  const selectRecords = prepareStatement<{ userId: string }, Update>(
    await getPool(),
    "SELECT * FROM Updates INNER JOIN UserSwimmers ON(Updates.updateType = 'swimmer' AND Updates.targetId = UserSwimmers.swimmerId) WHERE UserSwimmers.userId = :userId"
  )
  const data = await selectRecords.all( { userId: userId ?? event.context.session.userId } )
  return data
} )
