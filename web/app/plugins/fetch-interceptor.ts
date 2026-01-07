import type { FetchError } from "ofetch"

export default defineNuxtPlugin( () => {
  const FETCH_WRAPPED = Symbol.for( "nuxt.$fetch.wrapped" )

  const g = globalThis as unknown as Record<symbol, boolean>
  if ( g[FETCH_WRAPPED] ) return
  g[FETCH_WRAPPED] = true

  const nuxtApp = useNuxtApp()

  // 1) Keep the *real* Nuxt/Nitro $fetch type
  type NuxtFetch = typeof globalThis.$fetch
  type FetchArgs = Parameters<NuxtFetch>

  // 2) Capture original fetch (do NOT change its type)
  const originalFetch: NuxtFetch = globalThis.$fetch

  const { refresh } = useSessionUser()
  const resetAppState = useAppReset()

  // 3) Wrap using the same args as Nuxt/Nitro expects
  const wrapped = ( async ( ...args: FetchArgs ): ReturnType<NuxtFetch> => {
    const request = args[0]
    let options = ( args[1] ?? {} ) as FetchArgs[1]

    const isApiRequest = typeof request === "string" && request.startsWith( "/api" )

    if ( import.meta.server && isApiRequest ) {
      const reqHeaders = nuxtApp.ssrContext?.event?.node?.req?.headers ?? {}

      const mergedHeaders = new Headers( options?.headers )
      if ( reqHeaders.cookie ) {
        mergedHeaders.set( "cookie", reqHeaders.cookie )
      }

      options = {
        ...( options as object ),
        headers: mergedHeaders,
      } as FetchArgs[1]
    }

    options = {
      ...( options as object ),
      credentials: isApiRequest ? "include" : "omit",
    } as FetchArgs[1]

    try {
      // 4) Bridge the call through a non-instantiating signature to avoid “excessive stack depth”
      const call = originalFetch as unknown as ( ...a: FetchArgs ) => ReturnType<NuxtFetch>
      return await call( request, options )
    } catch ( error: unknown ) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "response" in error
          ? ( error as FetchError ).response?.status
          : undefined

      if ( isApiRequest && import.meta.client ) {
        const isMeRequest = typeof request === "string" && request.startsWith( "/api/auth/me" )
        if ( !isMeRequest ) {
          if ( status === 401 ) {
            await resetAppState()
            await refresh()
            navigateTo( "/login" )
          } else if ( status === 403 ) {
            showAlert( "Access denied. You do not have permission to view this resource.", "error" )
          }
        }
      }

      throw error
    }
  } ) as NuxtFetch

  // Preserve known helpers without Object.assign’ing unknown internals
  wrapped.raw = originalFetch.raw
  wrapped.create = originalFetch.create

  globalThis.$fetch = wrapped
} )
