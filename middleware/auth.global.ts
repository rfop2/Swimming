export default defineNuxtRouteMiddleware( async () => {
  const user = useUser()
  const data = await useRequestFetch()( "/api/user/current" )
  if ( data ) {
    user.value = data
  }
} )
