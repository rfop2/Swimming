export default defineNuxtRouteMiddleware( async () => {
  const user = useUser()
  if ( !user.value ) {
    return navigateTo( "/login" )
  }
  if ( !Number( user.value.admin ) ) {
    return navigateTo( "/" )
  }
} )
