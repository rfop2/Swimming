export default defineEventHandler( async ( event ) => {
  const { user, isImpersonating } = event.context

  if ( !user ) {
    throw createError( {
      status: 401,
      message: "Not authenticated"
    } )
  }

  return {
    user,
    impersonating: isImpersonating
  }
} )
