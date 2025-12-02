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
    "SELECT Tasks.*, CONCAT_WS( ' ', User.firstName, User.lastName ) as creatorName FROM Tasks LEFT JOIN User ON (Tasks.creatorId = User.id) WHERE (creatorId = :userId OR :isAdmin = 1) AND Tasks.created >= NOW() - INTERVAL 3 DAY"
  )
  const tasks = await selectRecords.all( { userId, isAdmin } )
  return tasks
} )
