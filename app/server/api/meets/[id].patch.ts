import { defineEventHandler } from "h3"
import { prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user  ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const meetId = getRouterParam( event, "id" )
  if ( !meetId ) {
    throw createError( {
      message: "No meet id supplied",
      status: 403,
  } )
  }
  try {
    const updateMeet = prepareStatement<{ userId: string, meetId: string }>(
      "INSERT OR REPLACE INTO UserMeets VALUES( :userId, :meetId, NULL )"
    )
    await updateMeet.run( { userId: event.context.user.id, meetId } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update user meets",
      statusCode: 500
    } )
  }
} )
