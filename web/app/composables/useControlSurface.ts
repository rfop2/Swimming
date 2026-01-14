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

  type OrientationLock =
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary"
  | "any"

  const lockOrientation = async () => {
    const orientation = screen.orientation as ScreenOrientation & {
    lock?: ( type: OrientationLock ) => Promise<void>
  }

    const lock = orientation.lock
    if ( !lock ) return

    try {
      await lock( "portrait-primary" )
    } catch {
    // denied / unsupported
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
