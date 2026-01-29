import type { Pool, PoolConnection } from "mysql2/promise"
import { prepareStatement } from "./database.js"
import type { DatabaseUser, Notification, NotificationType, UserNotification } from "./types.js"

export const addNotification = async ( conn: Pool | PoolConnection, creatorId: string, targetId: string, type: NotificationType, text: string ) => {
  const addNotification = prepareStatement<{
    creatorId: Notification["notificationCreatorId"]
    targetId: Notification["notificationTargetId"]
    type: Notification["notificationType"]
    text: Notification["notificationText"]
  },void>(
    conn,
    "INSERT INTO Notifications SET notificationCreatorId = :creatorId, notificationTargetId = :targetId, notificationType = :type, notificationText = :text"
  )

  console.log( "Adding notification", type, text )
  return await addNotification.run( {
    creatorId,
    targetId,
    type,
    text
  } )
}

export const addSystemNotification = async ( conn: Pool | PoolConnection, targetId: string, type: NotificationType, text: string ) => {
  const getSystemUser = prepareStatement<void>( conn, "SELECT * FROM User WHERE type = 'system'" )
  const systemUser = await getSystemUser.get()
  if ( !systemUser ) {
    throw new Error( "Can't find system user in database" )
  }
  return addNotification( conn, systemUser.id, targetId, type, text )
}

export const getUserNotifications = async( conn: Pool | PoolConnection, user: DatabaseUser, type?: NotificationType ) => {
  const getNotifications = prepareStatement<{ userId: string, isAdmin: number, type: NotificationType | null}, UserNotification>(
    conn,
    `
    SELECT
      Notifications.notificationId,
      Notifications.notificationCreatorId,
      Notifications.notificationTargetId,
      Notifications.notificationType,
      Notifications.notificationText,
      NotificationViews.notificationViewed
    FROM
      Notifications
      LEFT JOIN NotificationViews
      ON( Notifications.notificationId = NotificationViews.notificationId AND NotificationViews.notificationUserId = :userId)
    WHERE
      (notificationTargetId = :userId OR (notificationTargetId = 'admin' AND :isAdmin) OR notificationTargetId = '')
      AND (notificationType = :type OR ISNULL(:type))
      AND (ISNULL(notificationDeleted) OR notificationDeleted != 1)
    ORDER BY Notifications.notificationId ASC
    `,
  )
  return await getNotifications.all( {
    userId: user.id,
    isAdmin: Number( user.admin ),
    type: type ?? null,
  } )
}
