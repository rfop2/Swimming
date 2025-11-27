import { getPool, runTransaction } from "lib"
import { addUser } from "~/server/utils/database"

export default defineEventHandler( async ( event ) => {
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

    const userData = await readBody( event )

    await runTransaction( await getPool(), addUser, userData )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to create user record",
      status: 500
    } )
  }
} )
