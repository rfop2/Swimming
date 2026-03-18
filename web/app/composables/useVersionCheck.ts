const updateAvailable = ref( false )
const newVersion = ref<string | null>( null )

export function useVersionCheck() {
  const user = useUser()
  const config = useRuntimeConfig()
  const currentVersion = config.public.appVersion
  let checkTimer: NodeJS.Timeout | null = null

  async function checkVersion() {
    if ( !user && checkTimer ) {
      clearInterval( checkTimer )
      return
    }
    try {
      const { version } = await $fetch<{ version: string }>( "/api/version", { cache: "no-store" } )
      if ( version !== currentVersion ) {
        updateAvailable.value = true
        newVersion.value = version
      }
    } catch ( err ) {
      console.error( "Version check failed:", err )
    }
  }

  // initial + periodic checks
  if ( import.meta.client ) {
    const handleVisibilityChange = () => {
      if ( document.visibilityState === "visible" )
        checkVersion()
    }

    onMounted( () => {
      checkVersion() // initial check after mount
      checkTimer = setInterval( checkVersion, 300 * 1000 ) // periodic checks
      document.addEventListener( "visibilitychange", handleVisibilityChange )
    } )
    watch( user, ( val ) => {
      if ( !val && checkTimer )
        clearInterval( checkTimer )
    } )
    onUnmounted( () => {
      if ( checkTimer )
        clearInterval( checkTimer )
      document.removeEventListener( "visibilitychange", handleVisibilityChange )
    } )
  }

  return { updateAvailable, newVersion }
}
