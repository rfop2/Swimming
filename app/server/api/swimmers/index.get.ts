import { defineEventHandler } from "h3"
import type { Statement } from "better-sqlite3"
import Database from "better-sqlite3"
import { DB_PATH, type Swimmer } from "lib"

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

const selectRecords: Statement<unknown[],Swimmer> = db.prepare( "SELECT id, name, birthday, gender, nationality, region, county, active FROM UserSwimmersView WHERE userId = :userId AND active = 1" )
export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const data = selectRecords.all( { userId: event.context.session.userId } )
  return data
} )
