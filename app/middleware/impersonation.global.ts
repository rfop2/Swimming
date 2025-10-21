export default defineNuxtRouteMiddleware( () => {
  const adminSession = useCookie( "admin_session" )
  const impersonating = useState( "impersonating", () => false )
  impersonating.value = !!adminSession.value
} )
