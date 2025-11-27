export default defineNuxtPlugin( async () => {
  const { user, refresh } = useSessionUser()

  // If user is not yet known, fetch once on app startup
  if ( !user.value ) {
    await refresh()
  }
} )
