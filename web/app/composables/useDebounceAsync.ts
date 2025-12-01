export const useDebounceAsync = <
  Args extends unknown[],
  R
>(
    func: ( ...args: Args ) => Promise<R>,
    delay = 300
  ) => {
  let timer: ReturnType<typeof setTimeout>
  let latestCallId = 0

  return ( ...args: Args ): Promise<R> => {
    return new Promise( ( resolve, reject ) => {
      clearTimeout( timer )

      timer = setTimeout( async () => {
        const callId = ++latestCallId
        try {
          const result = await func( ...args )
          if ( callId === latestCallId ) {
            resolve( result )
          }
        } catch ( err ) {
          if ( callId === latestCallId ) {
            reject( err )
          }
        }
      }, delay )
    } )
  }
}
