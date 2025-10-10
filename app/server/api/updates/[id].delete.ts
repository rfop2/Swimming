import { getPool, prepareStatement, type Update } from "lib"

export default eventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  try {
    const updateId = getRouterParam( event, "id" )
    if ( !updateId ) {
      throw createError( {
        message: "No update id found",
        status: 400
      } )
    }

    const selectUpdate = prepareStatement<{ updateId: string }, Update>(
      await getPool(),
      "SELECT * FROM Updates WHERE Id = :updateId"
    )
    const update = await selectUpdate.get( { updateId } )
    if ( !update ) {
      throw createError( {
        message: `Update ${updateId} not found`,
        status: 404
      } )
    }

    if ( update.creatorId !== event.context.user.id && !Number( event.context.user.admin ) ) {
      throw createError( {
        status: 403
      } )
    }

    const updateJob = prepareStatement<{ updateId: string }>(
      await getPool(),
      "UPDATE Updates SET updateStatus = 'cancelled' WHERE id = :updateId"
    )
    await updateJob.run( { updateId } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update job record",
      status: 500
    } )
  }
} )
