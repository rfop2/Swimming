import { verifyRequestOrigin } from "lucia"
import type { User, Session } from "lucia"

export default defineEventHandler( async ( event ) => {
  if ( event.node.req.method !== "GET" ) {
    const originHeader = getHeader( event, "Origin" ) ?? null
    const hostHeader = getHeader( event, "Host" ) ?? null
    if ( !originHeader || !hostHeader || !verifyRequestOrigin( originHeader, [ hostHeader ] ) ) {
      return event.node.res.writeHead( 403 ).end()
    }
  }

  const sessionId = getCookie( event, lucia.sessionCookieName ) ?? null

  if ( !sessionId ) {
    event.context.session = null
    event.context.user = null
    event.context.adminUser = null
    event.context.isImpersonating = false
    return
  }

  const { session, user } = await lucia.validateSession( sessionId )

  if ( session && session.fresh ) {
    appendHeader( event, "Set-Cookie", lucia.createSessionCookie( session.id ).serialize() )
  }

  if ( !session ) {
    appendHeader( event, "Set-Cookie", lucia.createBlankSessionCookie().serialize() )
    event.context.session = null
    event.context.user = null
    event.context.adminUser = null
    event.context.isImpersonating = false
    return
  }

  // -----------------------------
  // 🔹 Impersonation reconstruction
  // -----------------------------

  const adminSessionId = getCookie( event, "admin_session" ) ?? null

  let adminUser: User | null = null
  let isImpersonating = false

  if ( adminSessionId ) {
    const { session: adminSession, user: admin } = await lucia.validateSession( adminSessionId )

    if ( adminSession && admin && Number( admin.admin ) ) {
      adminUser = admin
      isImpersonating = true
    }
  }

  event.context.session = session
  event.context.user = user
  event.context.adminUser = adminUser
  event.context.isImpersonating = isImpersonating
} )

declare module "h3" {
  interface H3EventContext {
    user: User | null
    session: Session | null
    adminUser: User | null
    isImpersonating: boolean
  }
}
