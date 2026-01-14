export {}

declare global {
  interface ScreenOrientation {
    lock( type: OrientationLockType ): Promise<void>
  }
}
