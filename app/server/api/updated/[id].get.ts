import { defineEventHandler } from "h3"
import type { Statement } from "better-sqlite3"
import Database from "better-sqlite3"
import { DB_PATH } from "lib"

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

const selectMaxCreated: Statement<unknown[], { MaxCreated: string }> = db.prepare( "SELECT MAX(created) AS MaxCreated FROM Performance WHERE swimmer = :id" )

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const id = getRouterParam( event, "id" )
  const result = selectMaxCreated.get( { id } )
  if ( !result?.MaxCreated ) {
    throw createError( { status: 404, statusText: "No records found"} )
  }
  // console.log( "Data", data )
  return result.MaxCreated
} )
