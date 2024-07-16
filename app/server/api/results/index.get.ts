import { defineEventHandler } from "h3"
import type { Statement } from "better-sqlite3"
import Database from "better-sqlite3"
import { DB_PATH, type ResultsRow } from "lib"

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

type Params = {
  course?: string
  stroke?: string
  distance?: string
}

const selectRecords: Statement<Params, ResultsRow> = db.prepare( "SELECT * FROM Results WHERE course = :course AND stroke = :stroke AND distance = :distance ORDER BY date ASC" )

export default defineEventHandler( async ( event ) => {
  const query = getQuery( event )
  const data = selectRecords.all( query )
  // console.log( "Data", data )
  return data
} )
