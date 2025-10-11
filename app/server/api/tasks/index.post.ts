import { getPool, isMySql2Error, prepareStatement } from "lib"

export default eventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  try {
    const userId = getRouterParam( event, "id" ) ?? event.context.user.id
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

    const taskData = await readBody( event )

    const addTask = prepareStatement(
      await getPool(),
      "INSERT INTO Tasks ( creatorId, taskType, targetType, targetId, taskOptions  ) VALUES( :userId, :taskType, :targetType, :targetId, :taskOptions )"
    )

    const tasks = Array.isArray( taskData ) ? taskData : [ taskData ]
    for ( const task of tasks ) {
      const result = await addTask.run( { ...task, userId } )
      const taskId = result.insertId
      console.log( `Task ${taskId} created` )
    }
  } catch ( error ) {
    console.error( error )
    if ( isMySql2Error( error ) ) {
      throw createError( {
        message: `Database error: ${error.sqlMessage}`,
        status: 400
      } )
    }
    throw createError( {
      message: "Unable to create task record",
      status: 500
    } )
  }
} )
