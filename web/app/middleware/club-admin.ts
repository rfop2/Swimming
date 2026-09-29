import type { UserClub } from "lib"

export default defineNuxtRouteMiddleware( async () => {
  const user = useUser()
  if ( !user.value ) {
    return navigateTo( "/login" )
  }
  if ( user.value.role === "admin" ) return

  const clubs = await useRequestFetch()<UserClub[]>( "/api/userclubs/" ).catch( () => [] as UserClub[] )
  if ( !clubs.some( c => c.clubOwner ) ) {
    return navigateTo( "/personal-bests" )
  }
} )
