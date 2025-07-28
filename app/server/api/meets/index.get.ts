import { defineEventHandler } from "h3"
import type { Statement } from "better-sqlite3"
import Database from "better-sqlite3"
import { DB_PATH, type Meet } from "lib"

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

const selectRecords: Statement<unknown[], Meet> = db.prepare( "SELECT * FROM MeetsView" )

export default defineEventHandler( async ( _event ) => {
  const data = selectRecords.all()
  return data
} )
