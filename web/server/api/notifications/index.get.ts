import { chance, type DatabaseUser, getPool, getUserNotifications, purgeNotifications } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  if ( chance( 1 ) ) {
    await purgeNotifications( await getPool() )
  }
  const notifications = await getUserNotifications( await getPool(), event.context.user as DatabaseUser )
  return notifications
} )
