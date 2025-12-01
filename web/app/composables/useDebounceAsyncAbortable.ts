export const useDebounceAsyncAbortable = <
  Args extends unknown[],
  R
>(
    func: ( ...args: [...Args, AbortSignal] ) => Promise<R>,
    delay = 300
  ) => {
  let timer: ReturnType<typeof setTimeout>
  let controller: AbortController | null = null

  return ( ...args: Args ): Promise<R> => {
    return new Promise( ( resolve, reject ) => {
      clearTimeout( timer )

      timer = setTimeout( async () => {
        controller?.abort() // cancel previous request
        controller = new AbortController()

        try {
          const result = await func( ...args, controller.signal )
          resolve( result )
        } catch ( err ) {
          if ( ( err as DOMException ).name === "AbortError" ) {
            // Ignore aborted calls
            return
          }
          reject( err )
        }
      }, delay )
    } )
  }
}
