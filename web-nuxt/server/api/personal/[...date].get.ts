import "dotenv/config"
import { defineEventHandler } from 'h3';
import Database, { Statement } from "better-sqlite3"
import { format, addDays, parseISO } from "date-fns"

// Create a local database to persist state
const db = new Database( "../db/records.db" )
db.pragma( "journal_mode = WAL" );

const selectMaxCreated: Statement<unknown[],{ MaxCreated: string }> = db.prepare( "SELECT MAX(created) AS MaxCreated FROM Individual" )
const selectRecords: Statement<{ date: string}> = db.prepare( "SELECT * FROM Individual WHERE created = :date" )

export default defineEventHandler( async ( event ) => {
  console.log( "Event", event )
  console.log( "Params", getRouterParams( event ) )
  let bindParams = { date: "" }
  const date = getRouterParam( event, "date" )
  if ( date ) {
    bindParams = { date }
  } else {
    const result = selectMaxCreated.get()
    console.log( "Result", result )
    if ( result?.MaxCreated ) {
      bindParams = { date: result.MaxCreated }
    }
  }
  const data = selectRecords.all( bindParams )
  console.log( "Data", data )
  return data
})
