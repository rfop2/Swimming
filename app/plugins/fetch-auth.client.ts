// ~/plugins/fetch-auth.client.ts
import { defineNuxtPlugin, useRouter, useRoute } from "#app"
import { showAlert } from "~/composables/useAlert"

export default defineNuxtPlugin( ( nuxtApp ) => {
  const router = useRouter()
  const route = useRoute()

  // Explicitly type $fetch to avoid "unknown" errors
  const originalFetch = nuxtApp.$fetch as typeof $fetch

  nuxtApp.$fetch = ( async ( ...args: Parameters<typeof $fetch> ) => {
    try {
      return await originalFetch( ...args )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch ( err: any ) {
      const status = err?.response?.status ?? err?.status

      if ( status === 401 ) {
        if ( route.path !== "/login" ) {
          router.push( { path: "/login", query: { redirect: route.fullPath } } )
        }
      } else if ( status === 403 ) {
        showAlert( "Access Denied: You do not have permission to view this resource.", "error" )
      }

      throw err
    }
  } ) as typeof $fetch
} )
