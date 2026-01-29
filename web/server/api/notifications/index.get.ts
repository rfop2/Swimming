import { type DatabaseUser, getPool, getUserNotifications } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const notifications = await getUserNotifications( await getPool(), event.context.user as DatabaseUser )
  return notifications
} )
