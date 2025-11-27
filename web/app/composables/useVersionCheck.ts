const updateAvailable = ref( false )
const newVersion = ref<string | null>( null )

export function useVersionCheck() {
  const config = useRuntimeConfig()
  const currentVersion = config.public.appVersion

  async function checkVersion() {
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
    onMounted( () => {
      checkVersion() // initial check after mount
      setInterval( checkVersion, 300 * 1000 ) // periodic checks
    } )
  }

  return { updateAvailable, newVersion }
}
