import type { Notification, UserNotification } from "lib"

export function useNotifications() {
  const user = useUser()
  // Global shared state (persists across all composable calls)
  const notifications = useState<UserNotification[]>( "notifications", () => [] )
  const loaded = useState( "notificationsLoaded", () => false )
  const loading = useState( "notificationsLoading", () => false )

  const fetchNotifications = async () => {
    // Prevent concurrent or redundant fetches
    if ( loading.value ) return
    loading.value = true

    try {
      notifications.value = await $fetch<UserNotification[]>( "/api/notifications" )
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  // Auto-fetch if not loaded yet
  if ( import.meta.client && user.value && !loaded.value && !loading.value ) {
    // Runs only on client side to avoid duplicate SSR calls
    fetchNotifications()
  }

  // Create a notification
  const createNotification = async ( notification: Partial<Notification> ) => {
    await $fetch( "/api/notifications/", {
      method: "POST",
      body: notification,
    } )
    await fetchNotifications() // reload list after update
  }

  // Create multiple notifications
  const createNotifications = async ( notifications: Array<Partial<Notification>> ) => {
    await $fetch( "/api/notifications/", {
      method: "POST",
      body: notifications,
    } )
    await fetchNotifications() // reload list after update
  }

  // Update a notification
  /* const updateNotification = async ( notification: Notification ) => {
    await $fetch( `/api/notifications/${notification.notificationId}`, {
      method: "PUT",
      body: notification,
    } )
    await fetchNotifications() // reload list after update
  } */

  // Mark a notification as read
  const readNotification = async ( notification: Notification ) => {
    await $fetch( `/api/notifications/${notification.notificationId}`, {
      method: "PATCH",
    } )
    await fetchNotifications() // reload list after update
  }

  // Mark all notifications as read
  const readNotifications = async () => {
    await $fetch( "/api/notifications/0", {
      method: "PATCH",
    } )
    await fetchNotifications() // reload list after update
  }

  // Delete a notification
  const deleteNotification = async ( notificationId: number ) => {
    await $fetch( `/api/notifications/${notificationId}`, {
      method: "DELETE"
    } )
    await fetchNotifications() // reload list after delete
  }

  // Delete all notifications
  const deleteNotifications = async () => {
    await $fetch( "/api/notifications/0", {
      method: "DELETE"
    } )
    await fetchNotifications() // reload list after delete
  }

  return {
    notifications,
    fetchNotifications,
    createNotification,
    createNotifications,
    // updateNotification,
    readNotification,
    readNotifications,
    deleteNotification,
    deleteNotifications,
  }
}
