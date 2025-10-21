import { getCookie, setCookie, deleteCookie } from "h3"

export default defineEventHandler( async ( event ) => {
  const adminSessionId = getCookie( event, "admin_session" )
  if ( !adminSessionId ) {
    throw createError( {
      status: 400,
      message: "Not impersonating"
    } )
  }

  const { session: adminSession, user: adminUser } = await lucia.validateSession( adminSessionId )
  if ( !adminSession || !adminUser || !adminUser.admin ) {
    throw createError( {
      status: 403,
      message: "Invalid admin session"
    } )
  }

  // Restore admin session
  const cookie = lucia.createSessionCookie( adminSession.id )
  setCookie( event, cookie.name, cookie.value, cookie.attributes )

  // Clear impersonation marker
  deleteCookie( event, "admin_session" )

  return { success: true }
} )
