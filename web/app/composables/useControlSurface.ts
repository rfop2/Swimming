export const useControlSurface = () => {
  let wakeLock: WakeLockSentinel | null = null
  let orientationLocked = false

  onMounted( () => {
    document.addEventListener( "visibilitychange", () => {
      if ( document.visibilityState === "visible" ) {
        acquireWakeLock?.()
      }
    } )
  } )

  const lockOrientation = async () => {
    if ( !( "orientation" in screen ) ) return

    try {
      // portrait-primary is the safest choice for phones
      await screen.orientation.lock( "portrait-primary" )
      orientationLocked = true
    } catch {
      // Ignore — unsupported or denied
    }
  }

  const unlockOrientation = async () => {
    if ( !orientationLocked || !( "orientation" in screen ) ) return

    try {
      screen.orientation.unlock()
    } catch {
      // Ignore
    } finally {
      orientationLocked = false
    }
  }

  const acquireWakeLock = async () => {
    if ( !( "wakeLock" in navigator ) ) return

    try {
      wakeLock = await navigator.wakeLock.request( "screen" )
      wakeLock.addEventListener( "release", () => {
        wakeLock = null
      } )
    } catch {
      // Ignore — unsupported or denied
    }
  }

  const releaseWakeLock = async () => {
    if ( !wakeLock ) return

    try {
      await wakeLock.release()
    } catch {
      // Ignore
    } finally {
      wakeLock = null
    }
  }

  const enable = async () => {
    await lockOrientation()
    await acquireWakeLock()
  }

  const disable = async () => {
    await releaseWakeLock()
    await unlockOrientation()
  }

  return {
    enable,
    disable,
  }
}
