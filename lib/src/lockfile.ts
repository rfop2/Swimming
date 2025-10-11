// lockfile.ts
/**
 * Cross-platform, race-safe lock file mechanism using dynamic Node imports.
 * Safe to include in shared libraries (will no-op in non-Node environments).
 */
export async function acquireLock(): Promise<void> {
  if ( typeof process === "undefined" || typeof window !== "undefined" ) {
    // Running in a browser or non-Node context — do nothing.
    return
  }

  const [ { default: fs }, { default: path } ] = await Promise.all( [
    import( "fs" ),
    import( "path" ),
  ] )

  const script = process.argv[1]
    ? path.basename( process.argv[1], path.extname( process.argv[1] ) )
    : "unknown"
  const lockFile = path.join( getTempDir(), `${script}.lock` )

  try {
    const fd = fs.openSync( lockFile, "wx" )
    fs.writeSync( fd, process.pid.toString() )
    fs.closeSync( fd )

    const cleanup = () => {
      try {
        if ( fs.existsSync( lockFile ) ) {
          const pid = fs.readFileSync( lockFile, "utf-8" ).trim()
          if ( pid === process.pid.toString() ) {
            fs.unlinkSync( lockFile )
          }
        }
      } catch {
        // ignore cleanup errors
      }
    }

    process.on( "exit", cleanup )
    process.on( "SIGINT", () => {
      cleanup()
      process.exit( 1 )
    } )
    process.on( "SIGTERM", () => {
      cleanup()
      process.exit( 1 )
    } )
  } catch ( err: unknown ) {
    if ( isNodeError( err ) && err.code === "EEXIST" ) {
      await handleExistingLock( lockFile )
    } else {
      throw err
    }
  }

  async function handleExistingLock( lockFile: string ): Promise<void> {
    try {
      const pid = parseInt( fs.readFileSync( lockFile, "utf-8" ), 10 )

      if ( !isNaN( pid ) && processExists( pid ) ) {
        console.error( `❌ Another instance (PID ${pid}) is already running.` )
        process.exit( 1 )
      }

      console.warn( `⚠️ Removing stale lock file for PID ${pid}.` )
      fs.unlinkSync( lockFile )
      await acquireLock() // retry once
    } catch ( err: unknown ) {
      const message = err instanceof Error ? err.message : String( err )
      console.error( `Failed to handle existing lock: ${message}` )
      process.exit( 1 )
    }
  }

  function processExists( pid: number ): boolean {
    try {
      process.kill( pid, 0 )
      return true
    } catch ( err: unknown ) {
      return isNodeError( err ) && err.code === "EPERM"
    }
  }

  function isNodeError( err: unknown ): err is NodeJS.ErrnoException {
    return err instanceof Error && "code" in err
  }

  function getTempDir(): string {
    return process.platform === "win32" ? process.env.TEMP ?? "C:\\Temp" : "/tmp"
  }
}
