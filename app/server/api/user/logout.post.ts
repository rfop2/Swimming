export default eventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      status: 401
    } )
  }
  await lucia.invalidateSession( event.context.session.id )
  appendHeader( event, "Set-Cookie", lucia.createBlankSessionCookie().serialize() )
} )
