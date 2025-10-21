import { setCookie } from "h3"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const { targetUserId } = await readBody<{ targetUserId: string }>( event )

  // Get admin’s current session ID from cookie
  const sessionId = getCookie( event, lucia.sessionCookieName )
  if ( !sessionId ) {
    throw createError( {
      status: 401,
      message: "Not logged in"
    } )
  }

  const { session, user } = await lucia.validateSession( sessionId )
  if ( !session || !user ) {
    throw createError( {
      status: 401,
      message: "Invalid session"
    } )
  }

  const isAdmin = Number( event.context.user.admin )
  if ( !session || !isAdmin ) {
    throw createError( {
      status: 403
    } )
  }

  // Store admin session ID in cookie (secure + httpOnly)
  setCookie( event, "admin_session", session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  } )

  // Create session for target user
  const targetSession = await lucia.createSession( targetUserId, {} )
  const cookie = lucia.createSessionCookie( targetSession.id )

  setCookie( event, cookie.name, cookie.value, cookie.attributes )
  return { success: true }
} )
