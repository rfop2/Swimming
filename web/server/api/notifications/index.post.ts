import type { Notification } from "lib"
import { addNotification, getPool, isMySql2Error } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  try {
    const userId = getRouterParam( event, "id" ) ?? event.context.user.id
    if ( !userId ) {
      throw createError( {
        message: "No user id found",
        status: 400
      } )
    }

    if ( userId !== event.context.user.id && !Number( event.context.user.admin ) ) {
      throw createError( {
        status: 403
      } )
    }

    const notificationData = await readBody<Notification | Notification[]>( event )

    const notifications = Array.isArray( notificationData ) ? notificationData : [ notificationData ]
    for ( const notification of notifications ) {
      if ( ( notification.notificationTargetId && ( notification.notificationTargetId !== userId ) && !Number( event.context.user.admin ) ) ) {
        throw createError( {
          status: 403,
          message: "Notification target is not current user",
        } )
      }
      const result = await addNotification( await getPool(), userId, notification.notificationTargetId ?? userId, notification.notificationType, notification.notificationText  )
      const notificationId = result.insertId
      console.log( `Notification ${notificationId} created` )
    }
  } catch ( error ) {
    console.error( error )
    if ( isMySql2Error( error ) ) {
      throw createError( {
        message: `Database error: ${error.sqlMessage}`,
        status: 500
      } )
    }
    throw createError( {
      message: "Unable to create notification",
      status: 500
    } )
  }
} )
