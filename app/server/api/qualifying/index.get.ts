import { defineEventHandler } from "h3"
import type { Statement } from "better-sqlite3"
import Database from "better-sqlite3"
import { DB_PATH, GENDER, type QualifyingRow } from "lib"

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

const selectRecords: Statement<{ gender: string }, QualifyingRow> = db.prepare( "SELECT * FROM Qualifying WHERE gender = :gender" )

export default defineEventHandler( async ( _event ) => {
  const data = selectRecords.all( { gender: GENDER } )
  return data
} )
