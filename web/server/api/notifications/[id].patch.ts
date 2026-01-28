import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const notificationId = getRouterParam( event, "id" )
  if ( !notificationId ) {
    throw createError( {
      message: "No notification id supplied",
      status: 400,
    } )
  }
  try {
    const updateNotification = prepareStatement<{ userId: string, notificationId: string }>(
      await getPool(),
      "INSERT IGNORE INTO NotificationViews ( notificationUserId, notificationId, notificationViewed ) VALUES( :userId, :notificationId, 1 )"
    )
    await updateNotification.run( { userId: event.context.user.id, notificationId } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update user notifications",
      status: 500
    } )
  }
} )
