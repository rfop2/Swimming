import { defineEventHandler } from "h3"
import type { Statement } from "better-sqlite3"
import Database from "better-sqlite3"
import { DB_PATH, type Meet } from "lib"

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

const deleteMeet: Statement<{ userId: string, meetId: string }, Meet> = db.prepare( "DELETE FROM UserMeets WHERE UserId = :userId AND meetId = :meetId" )

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user  ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const meetId = getRouterParam( event, "id" )
  if ( !meetId ) {
    throw createError( {
      message: "No meet id supplied",
      status: 403,
  } )
  }
  try {
    deleteMeet.run( { userId: event.context.user.id, meetId } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update user meets",
      statusCode: 500
    } )
  }
} )
