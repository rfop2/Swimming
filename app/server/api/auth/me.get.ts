export default defineEventHandler( async ( event ) => {
  const { user, impersonating } = await validateRequest( event )

  if ( !user ) {
    throw createError( {
      status: 401,
      message: "Not authenticated"
    } )
  }

  return { user, impersonating }
} )
