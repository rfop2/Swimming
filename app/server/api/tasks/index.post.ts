import { getPool, isMySql2Error, prepareStatement } from "lib"

export default eventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  try {
    const userId = getRouterParam( event, "id" )
    if ( !userId ) {
      throw createError( {
        message: "No user id found",
        status: 400
      } )
    }

    if ( userId !== event.context.user.id && !Number( event.context.user.admin ) ) {
      throw createError( {
        status: 403
      } )
    }

    const updateData = await readBody( event )

    const addUpdate = prepareStatement(
      await getPool(),
      "INSERT INTO Updates ( creatorId, updateType, targetType, targetId, updateOptions  ) VALUES( :userId, :updateType, :targetType, :targetId, :updateOptions )"
    )
    const result = await addUpdate.run( { ...updateData, userId } )
    const updateId = result.insertId
    console.log( `Update ${updateId} created` )
  } catch ( error ) {
    console.error( error )
    if ( isMySql2Error( error ) ) {
      throw createError( {
        message: `Database error: ${error.sqlMessage}`,
        status: 400
      } )
    }
    throw createError( {
      message: "Unable to create update record",
      status: 500
    } )
  }
} )
