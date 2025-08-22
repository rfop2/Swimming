import { defineEventHandler } from "h3"
import type { Statement } from "better-sqlite3"
import Database from "better-sqlite3"
import { DB_PATH, type Meet } from "lib"

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

const selectRecords: Statement<{ userId: string }, Meet> = db.prepare( "SELECT *, IIF( UserMeets.userId NOT NULL, 1, 0 ) AS tagged FROM MeetsView LEFT JOIN UserMeets ON UserMeets.meetId = MeetsView.id AND UserMeets.userId = :userId" )

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user  ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const data = selectRecords.all( { userId: event.context.user.id } )
  return data
} )
