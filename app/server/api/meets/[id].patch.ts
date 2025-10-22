import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const meetId = getRouterParam( event, "id" )
  if ( !meetId ) {
    throw createError( {
      message: "No meet id supplied",
      status: 400,
    } )
  }
  try {
    const updateMeet = prepareStatement<{ userId: string, meetId: string }>(
      await getPool(),
      "INSERT IGNORE INTO UserMeets VALUES( :userId, :meetId, NULL )"
    )
    await updateMeet.run( { userId: event.context.user.id, meetId } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update user meets",
      status: 500
    } )
  }
} )
