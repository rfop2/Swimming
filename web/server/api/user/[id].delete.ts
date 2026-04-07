import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const userId = getRouterParam( event, "id" )
  if ( !userId || event.context.user.role !== "admin" ) {
    throw createError( {
      status: 403
    } )
  }

  if ( userId === event.context.user.id ) {
    throw createError( {
      message: "Can't delete current logged in user",
      status: 400
    } )
  }

  const deleteUser = prepareStatement<{ userId: string }>(
    await getPool(),
    "DELETE FROM User WHERE id = :userId"
  )
  await deleteUser.run( { userId } )
  return "User deleted"
} )
