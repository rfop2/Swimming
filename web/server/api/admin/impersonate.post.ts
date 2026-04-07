import { getCookie, setCookie } from "h3"

export default defineEventHandler( async ( event ) => {
  const { targetUserId } = await readBody<{ targetUserId: string }>( event )

  // Validate admin session
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
  if ( user.role !== "admin" ) {
    throw createError( {
      status: 403,
      message: "Not authorised"
    } )
  }

  // Save current admin session ID
  setCookie( event, "admin_session", session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  } )

  // Create a new session for the impersonated user
  const newSession = await lucia.createSession( targetUserId, {} )
  const cookie = lucia.createSessionCookie( newSession.id )

  // Replace the auth cookie with the impersonated session
  setCookie( event, cookie.name, cookie.value, cookie.attributes )

  return { success: true, impersonating: targetUserId }
} )
