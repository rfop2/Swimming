import { defineEventHandler } from "h3"
import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const swimmerId = getRouterParam( event, "id" )
  if ( !swimmerId ) {
    throw createError( {
      message: "No swimmer id supplied",
      status: 400,
    } )
  }

  const updateInfo: { action: "cancel" | "basic" | "full" } = await readBody( event )

  try {
    const updateSwimmer = prepareStatement<{ swimmerId: string }>(
      await getPool(),
      "UPDATE Swimmers SET updateStatus = :status, updateType = :type WHERE id = :swimmerId"
    )
    await updateSwimmer.run( { swimmerId, ...( updateInfo.action === "cancel" ? { status: null, type: null } : { status: "pending", type: updateInfo.action } ) } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to modify swimmer update",
      statusCode: 500
    } )
  }
} )
