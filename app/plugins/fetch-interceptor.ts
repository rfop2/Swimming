// ~/plugins/fetch-interceptor.ts
import { ofetch, type FetchContext, type FetchResponse } from "ofetch"
import { showAlert } from "~/composables/useAlert"

export default defineNuxtPlugin( () => {
  // 1) Capture Nuxt's current $fetch and its exact type
  const _currentFetch = $fetch
  type NuxtFetch = typeof _currentFetch

  // 2) Build a wrapped instance with your interceptors
  const wrapped = ofetch.create( {
    async onRequest( context: FetchContext ) {
      if ( typeof context.request === "string" && context.request.startsWith( "/api" ) ) {
        context.options.credentials = "include"
      } else {
        context.options.credentials = "omit"
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onResponseError( ctx: FetchContext & { response: FetchResponse<any> } ) {
      const { request, response } = ctx

      // Only handle your app API (ignore external URLs)
      if ( typeof request !== "string" || !request.startsWith( "/api" ) ) {
        // rethrow so callers still see the error
        throw ctx.error ?? new Error( `Fetch error ${response?.status}` )
      }

      const status = response?.status

      if ( import.meta.client ) {
        if ( status === 401 ) {
          showAlert( "Your session has expired. Please log in again.", "warning" )
          navigateTo( "/login" )
        } else if ( status === 403 ) {
          showAlert( "Access denied. You do not have permission to view this resource.", "error" )
        }
      }

      // SSR: just propagate the error
      throw ctx.error ?? new Error( `Fetch error ${status}` )
    },
  } ) as unknown as NuxtFetch

  // 3) Replace global $fetch with the wrapped one
  globalThis.$fetch = wrapped
} )
