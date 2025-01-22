import { defineEventHandler } from "h3"
import type { Statement } from "better-sqlite3"
import Database from "better-sqlite3"
import { DB_PATH, type Individual } from "lib"

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

const selectMaxCreated: Statement<unknown[], { MaxCreated: string }> = db.prepare( "SELECT MAX(created) AS MaxCreated FROM Individual WHERE swimmer = :id" )
const selectRecords: Statement<{ date: string }, Individual> = db.prepare( "SELECT * FROM Individual WHERE swimmer = :id AND created = :date" )

export default defineEventHandler( async ( event ) => {
  const id = getRouterParam( event, "id" )
  const result = selectMaxCreated.get( { id } )
  if ( !result?.MaxCreated ) {
    throw createError( { status: 404, statusText: "No records found"} )
  }
  const bindParams = { id, date: result.MaxCreated }
  const data = selectRecords.all( bindParams )
  // console.log( "Data", data )
  return data
} )
