import { defineEventHandler } from "h3"
import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const id = getRouterParam( event, "id" )
  if ( !id ) {
    throw createError( {
      message: "No swimmer id supplied",
      status: 403,
    } )
  }

  const selectMaxCreated = prepareStatement<{ id: string }, { MaxCreated: string }>(
    await getPool(),
    "SELECT MAX(created) AS MaxCreated FROM Performance WHERE swimmer = :id"
  )
  const result = await selectMaxCreated.get( { id } )

  if ( !result?.MaxCreated ) {
    throw createError( { status: 404, statusText: "No records found" } )
  }
  // console.log( "Data", data )
  return result.MaxCreated
} )
