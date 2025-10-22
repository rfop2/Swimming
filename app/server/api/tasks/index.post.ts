import type { Task } from "lib"
import { getPool, isMySql2Error, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
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

    const taskData = await readBody<Task | Task[]>( event )

    const addTask = prepareStatement(
      await getPool(),
      "INSERT INTO Tasks ( creatorId, taskType, taskOptions, taskDescription, targetType, targetId ) VALUES( :userId, :taskType, :taskOptions, :taskDescription, :targetType, :targetId )"
    )

    const tasks = Array.isArray( taskData ) ? taskData : [ taskData ]
    for ( const task of tasks ) {
      if ( task.targetType === "user" && ( task.targetId !== userId && !Number( event.context.user.admin ) ) ) {
        throw createError( {
          status: 403,
          message: "Task target is not current user",
        } )
      }
      const result = await addTask.run( {
        taskOptions: task.taskOptions ?? null,
        ...task,
        userId
      } )
      const taskId = result.insertId
      console.log( `Task ${taskId} created` )
    }
  } catch ( error ) {
    console.error( error )
    if ( isMySql2Error( error ) ) {
      throw createError( {
        message: `Database error: ${error.sqlMessage}`,
        status: 500
      } )
    }
    throw createError( {
      message: "Unable to create task record",
      status: 500
    } )
  }
} )
