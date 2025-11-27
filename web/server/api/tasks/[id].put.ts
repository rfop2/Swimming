import { getPool, prepareStatement, type Task } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  try {
    const taskId = getRouterParam( event, "id" )
    if ( !taskId ) {
      throw createError( {
        message: "No task id found",
        status: 400
      } )
    }

    const selectTask = prepareStatement<{ taskId: string }, Task>(
      await getPool(),
      "SELECT * FROM Tasks WHERE TaskId = :taskId"
    )
    const task = await selectTask.get( { taskId } )
    if ( !task ) {
      throw createError( {
        message: `Task ${taskId} not found`,
        status: 404
      } )
    }

    if ( task.creatorId !== event.context.user.id && !Number( event.context.user.admin ) ) {
      throw createError( {
        status: 403
      } )
    }

    const jobData = await readBody( event )

    const taskJob = prepareStatement<{ taskId: string }>(
      await getPool(),
      "UPDATE Tasks SET taskStatus = :taskStatus WHERE taskId = :taskId"
    )
    await taskJob.run( { ...jobData, ...{ taskId } } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable update to task job record",
      status: 500
    } )
  }
} )
