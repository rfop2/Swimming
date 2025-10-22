import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      status: 401
    } )
  }
  await lucia.invalidateSession( event.context.session.id )
  appendHeader( event, "Set-Cookie", lucia.createBlankSessionCookie().serialize() )
  const ip = getRequestIP( event, { xForwardedFor: true } )
  const insertLog = prepareStatement( await getPool(), "INSERT INTO Logs SET logCategory = 'user', logType = 'logout', logText = :logText" )
  insertLog.run( { logText: `${event.context.user?.username} logged out, IP ${ip}, session ${event.context.session.id}` } )
  const insertTracking = prepareStatement( await getPool(), "INSERT INTO SessionTracking SET sessionId = :sessionId, sessionAction = 'logout', userId = :userId, sessionIP = :sessionIP" )
  insertTracking.run( { sessionId: event.context.session.id, userId: event.context.user?.id, sessionIP: ip } )
} )
