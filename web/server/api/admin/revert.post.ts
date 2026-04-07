import { getCookie, setCookie, deleteCookie } from "h3"

export default defineEventHandler( async ( event ) => {
  const adminSessionId = getCookie( event, "admin_session" )
  if ( !adminSessionId ) {
    throw createError( { statusCode: 400, message: "Not impersonating" } )
  }

  const { session, user } = await lucia.validateSession( adminSessionId )
  if ( !session || !user || user.role !== "admin" ) {
    throw createError( { statusCode: 403, message: "Invalid admin session" } )
  }

  // Restore admin’s session cookie
  const cookie = lucia.createSessionCookie( session.id )
  setCookie( event, cookie.name, cookie.value, cookie.attributes )

  // Remove impersonation marker
  deleteCookie( event, "admin_session" )

  return { success: true }
} )
