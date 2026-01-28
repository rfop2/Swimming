import type { Notification } from "lib"

export const useNotificationsCheck = () => {
  const user = useUser()
  const { notifications, fetchNotifications } = useNotifications()
  const lastNotifications = ref<Notification[]>( [] )
  let checkTimer: NodeJS.Timeout | null = null

  async function checkNotifications() {
    if ( !user && checkTimer ) {
      clearInterval( checkTimer )
      return
    }
    try {
      await fetchNotifications()
    } catch ( err ) {
      console.error( "Notifications check failed:", err )
    }
    lastNotifications.value = JSON.parse( JSON.stringify( notifications.value ) )
  }

  const checkInterval = Number( process.env.NOTIFICATIONS_CHECK_INTERVAL ?? 30 )

  // initial + periodic checks
  if ( import.meta.client ) {
    onMounted( () => {
      checkNotifications()
      checkTimer = setInterval( checkNotifications, checkInterval * 1_000 ) // periodic checks
    } )
    watch( user, ( val ) => {
      if ( !val && checkTimer )
        clearInterval( checkTimer )
    } )
    onUnmounted( () => {
      if ( checkTimer )
        clearInterval( checkTimer )
    } )
  }

  return { notifications }
}
