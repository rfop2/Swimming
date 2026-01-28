import type { Pool, PoolConnection } from "mysql2/promise"
import { prepareStatement } from "./database.js"
import type { DatabaseUser, Notification, NotificationType } from "./types.js"

export const addNotification = async ( conn: Pool | PoolConnection, creatorId: string, targetId: string, type: NotificationType, text: string ) => {
  const addNotification = prepareStatement<{
    creatorId: Notification["notificationCreatorId"]
    targetId: Notification["notificationTargetId"]
    type: Notification["notificationType"]
    text: Notification["notificationText"]
  },void>(
    conn,
    "INSERT INTO Notifications SET notificationCreatorId = :creatorId, notificationTargetId = targetId, notificationType = :type, notificationText = :text"
  )

  console.log( "Adding notification", type, text )
  return await addNotification.run( {
    creatorId,
    targetId,
    type,
    text
  } )
}

export const getUserNotifications = async( conn: Pool | PoolConnection, user: DatabaseUser, type?: NotificationType ) => {
  const getNotifications = prepareStatement<{ userId: string, isAdmin: boolean, type: NotificationType | null},Notification>(
    conn,
    `
    SELECT
      *
    FROM
      Notifications
      LEFT JOIN NotificationViews
      ON( Notifications.notificationId = NotificationViews.notificationId AND NotificationViews.notificationUserId = :userId)
    WHERE
      (notificationTargetId = :userId OR (notificationTargetId = 'admin' AND :isAdmin) OR notificationTargetId = '')
      AND (notificationType = :type OR ISNULL(:type))
      AND notificationViewed != 1
    ORDER BY Notifications.notificationId ASC
    `,
  )
  return await getNotifications.all( {
    userId: user.id,
    isAdmin: user.admin,
    type: type ?? null,
  } )
}
