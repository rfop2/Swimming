import { getPool, prepareStatement, type Task } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const userId = getRouterParam( event, "id" ) ?? event.context.session.userId
  if ( !userId ) {
    throw createError( {
      message: "No user id found",
      status: 400
    } )
  }

  const isAdmin = Number( event.context.user.admin )
  if ( userId !== event.context.user.id && !isAdmin ) {
    throw createError( {
      status: 403
    } )
  }

  const selectRecords = prepareStatement<{ userId: string, isAdmin: number }, Task>(
    await getPool(),
    "SELECT * FROM Tasks WHERE creatorId = :userId OR :isAdmin = 1"
  )
  const tasks = await selectRecords.all( { userId, isAdmin } )
  return tasks
} )
