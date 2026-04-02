import { getPool, prepareStatement, type Task } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const taskId = getRouterParam( event, "id" )
  if ( !taskId ) {
    throw createError( {
      message: "No task id found",
      status: 400
    } )
  }

  const selectTask = prepareStatement<{ taskId: string }, Task>(
    await getPool(),
    "SELECT * FROM Tasks WHERE taskId = :taskId"
  )
  const task = await selectTask.get( { taskId } )
  if ( !task ) {
    throw createError( {
      message: `Task ${taskId} not found`,
      status: 404
    } )
  }

  if ( task.creatorId !== event.context.user.id && event.context.user.role !== "admin" ) {
    throw createError( {
      status: 403
    } )
  }

  if ( task.taskStatus !== "pending" ) {
    throw createError( {
      message: "Task is not cancellable",
      status: 410,
    } )
  }

  try {
    const taskJob = prepareStatement<{ taskId: string }>(
      await getPool(),
      "UPDATE Tasks SET taskStatus = 'cancelled' WHERE taskId = :taskId"
    )
    await taskJob.run( { taskId } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to cancel task",
      status: 500
    } )
  }
} )
