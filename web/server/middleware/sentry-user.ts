import * as Sentry from "@sentry/nuxt"

export default defineEventHandler( ( event ) => {
  const user = event.context.user

  if ( user ) {
    Sentry.setUser( {
      id: user.id,
      username: user.username,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
    } )
  } else {
    Sentry.setUser( null )
  }
} )
