import { type DatabaseUser, getPool, getUserNotifications, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const userId = event.context.user.id

  const notificationId = getRouterParam( event, "id" )
  if ( notificationId === undefined ) {
    throw createError( {
      message: "No notification id supplied",
      status: 400,
    } )
  }
  const updateNotification = prepareStatement<{ userId: string, notificationId: string }>(
    await getPool(),
      `INSERT INTO NotificationViews
        ( notificationUserId, notificationId, notificationViewed )
       VALUES
        ( :userId, :notificationId, 1 )
      ON DUPLICATE KEY UPDATE
        notificationViewed = 1
      ;`
  )
  if ( notificationId !== "0" ) {
    try {
      await updateNotification.run( { userId, notificationId } )
    } catch ( error ) {
      console.error( error )
      throw createError( {
        message: "Unable to update user notification",
        status: 500
      } )
    }
  } else {
    try {
      const notifications = await getUserNotifications( await getPool(), event.context.user as DatabaseUser )
      for ( const notification of notifications ) {
        await updateNotification.run( { userId, notificationId: String( notification.notificationId ) } )
      }
    } catch ( error ) {
      console.error( error )
      throw createError( {
        message: "Unable to update user notifications",
        status: 500
      } )
    }
  }
} )
