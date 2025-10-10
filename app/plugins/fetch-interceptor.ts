// ~/plugins/fetch-interceptor.ts
export default defineNuxtPlugin( () => {
  // 1) Capture the original function and its exact type
  const originalFetch = globalThis.$fetch
  type NuxtFetch = typeof originalFetch

  // 2) Build a wrapped callable with the SAME call signature
  const wrapped = ( async ( ...args: Parameters<NuxtFetch> ) => {
    // args is [request, options?]
    const request = args[0]
    let options = args[1]

    // Pre-request logic (only for your app API)
    if ( typeof request === "string" && request.startsWith( "/api" ) ) {
      options = { ...( options || {} ), credentials: "include" }
    } else {
      options = { ...( options || {} ), credentials: "omit" }
    }

    try {
      // Call the original $fetch to preserve all SSR/Nitro behavior
      return await originalFetch( request, options )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch ( error: any ) {
      // Post-error handling
      const status = error?.response?.status
      if ( typeof request === "string" && request.startsWith( "/api" ) && import.meta.client ) {
        if ( status === 401 ) {
          showAlert( "Your session has expired. Please log in again.", "warning" )
          navigateTo( "/login" )
        } else if ( status === 403 ) {
          showAlert( "Access denied. You do not have permission to view this resource.", "error" )
        }
      }
      throw error
    }
  } ) as NuxtFetch

  // 3) Preserve static members (raw, create, native, defaults, etc.)
  Object.assign( wrapped, originalFetch )

  // 4) Replace the global with the properly-typed wrapped function
  ;( globalThis as { $fetch: NuxtFetch } ).$fetch = wrapped
} )
