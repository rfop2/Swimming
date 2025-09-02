import { eq, max } from "drizzle-orm"
import { defineEventHandler } from "h3"
import { db, performance } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const id = getRouterParam( event, "id" )
  const [ result ]: { MaxCreated: string | null }[] = await db
   .select( {
    MaxCreated: max( performance.created ),
  } )
  .from( performance )
  .where( eq( performance.swimmer, id ) )
  if ( !result?.MaxCreated ) {
    throw createError( { status: 404, statusText: "No records found"} )
  }
  return result.MaxCreated
} )
