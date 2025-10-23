import type { User } from "lucia"

export default defineNuxtRouteMiddleware( async () => {
  const user = useUser()
  const data: User = await useRequestFetch()( "/api/user/current" )
  if ( data ) {
    user.value = data
  }
} )
