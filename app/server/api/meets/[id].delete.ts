import { defineEventHandler } from "h3"
import { getPool, prepareStatement, type Meet } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 403
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
    const deleteMeet = prepareStatement<{ userId: string, meetId: string }, Meet>(
      await getPool(),
      "DELETE FROM UserMeets WHERE UserId = :userId AND meetId = :meetId"
    )
    await deleteMeet.run( { userId: event.context.user.id, meetId } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update user meets",
      status: 500
    } )
  }
} )
