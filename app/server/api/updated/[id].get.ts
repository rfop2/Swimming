import { defineEventHandler } from "h3"
import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      status: 403
    } )
  }

  const id = getRouterParam( event, "id" )
  if ( !id ) {
    throw createError( {
      message: "No swimmer id supplied",
      status: 400,
    } )
  }

  const selectLastUpdate = prepareStatement<{ id: string }, { lastUpdateTime: Date | null }>(
    await getPool(),
    "SELECT lastUpdateTime FROM Swimmers WHERE id = :id"
  )
  const result = await selectLastUpdate.get( { id } )

  if ( !result?.lastUpdateTime ) {
    throw createError( { status: 404, statusText: "No records found" } )
  }
  // console.log( "Data", data )
  return result.lastUpdateTime
} )
