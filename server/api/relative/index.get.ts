import "dotenv/config"
import { defineEventHandler } from "h3"
import type { Statement } from "better-sqlite3"
import Database from "better-sqlite3"
import { DB_PATH } from "~/lib/config"
import type { PerformanceRow } from "~/lib/database"

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

const selectMaxCreated: Statement<unknown[], { MaxCreated: string }> = db.prepare( "SELECT MAX(created) AS MaxCreated FROM Performance" )
const selectRecords: Statement<{ date: string }, PerformanceRow> = db.prepare( "SELECT * FROM Performance WHERE created = :date" )

export default defineEventHandler( async ( event ) => {
  console.log( "Event", event )
  const result = selectMaxCreated.get()
  console.log( "Result", result )
  if ( !result?.MaxCreated ) {
    throw createError( { status: 404, statusText: "No records found"} )
  }
  const bindParams = { date: result.MaxCreated }
  const data = selectRecords.all( bindParams )
  // console.log( "Data", data )
  return data
} )
