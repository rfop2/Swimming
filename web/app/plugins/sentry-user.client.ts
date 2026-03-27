import * as Sentry from "@sentry/nuxt"

export default defineNuxtPlugin( () => {
  const user = useUser()

  watch( user, ( val ) => {
    if ( val ) {
      Sentry.setUser( {
        id: val.id,
        username: val.username,
        name: `${val.firstName} ${val.lastName}`.trim(),
        admin: val.admin,
      } )
    } else {
      Sentry.setUser( null )
    }
  }, { immediate: true } )
} )
