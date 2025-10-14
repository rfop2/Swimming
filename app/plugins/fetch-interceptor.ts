export default defineNuxtPlugin( () => {
  const originalFetch = globalThis.$fetch
  type NuxtFetch = typeof originalFetch

  const wrapped = ( async ( ...args: Parameters<NuxtFetch> ) => {
    const request = args[0]
    let options = args[1] ?? {}

    // --- Global logic ---
    const isApiRequest = typeof request === "string" && request.startsWith( "/api" )

    // Forward cookies automatically during SSR for /api requests
    if ( import.meta.server && isApiRequest ) {
      const headers = useRequestHeaders( [ "cookie" ] )
      options = { ...options, headers: { ...headers, ...( options.headers || {} ) } }
    }

    // Browser credentials policy
    options = {
      ...options,
      credentials: isApiRequest ? "include" : "omit",
    }

    try {
      // Call the original $fetch
      return await originalFetch( request, options )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch ( error: any ) {
      // --- Post-error handling (client-side only) ---
      const status = error?.response?.status

      if ( isApiRequest && import.meta.client ) {
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

  // Preserve static properties ($fetch.raw, $fetch.create, etc.)
  Object.assign( wrapped, originalFetch )

  // Replace the global fetch
  ;( globalThis as { $fetch: NuxtFetch } ).$fetch = wrapped
} )
