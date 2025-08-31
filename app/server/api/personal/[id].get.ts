import { defineEventHandler } from "h3"
import type { Statement } from "better-sqlite3"
import Database from "better-sqlite3"
import { DB_PATH, type Individual } from "lib"

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

const selectUserSwimmerIds: Statement<{ userId: string}, { swimmerId: string }> = db.prepare( "SELECT swimmerId FROM UserSwimmers WHERE userId = :userId" )
const selectMaxCreated: Statement<{ userId: string, swimmerId: string }, { MaxCreated: string }> = db.prepare( "SELECT MAX(created) AS MaxCreated FROM Individual INNER JOIN UserSwimmers ON Individual.swimmer = UserSwimmers.swimmerId AND UserSwimmers.userId = :userId WHERE swimmer = :swimmerId" )
const selectRecords: Statement<{ userId: string, swimmerId: string, date: string }, Individual> = db.prepare( "SELECT Individual.* FROM Individual INNER JOIN UserSwimmers ON Individual.swimmer = UserSwimmers.swimmerId AND UserSwimmers.userId = :userId WHERE swimmer = :swimmerId AND created = :date" )

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user  ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const userId = event.context.user.id
  const swimmerId = getRouterParam( event, "id" )
  if ( swimmerId ) {
    const result = selectMaxCreated.get( { userId, swimmerId } )
    if ( !result?.MaxCreated ) {
      throw createError( { status: 404, statusText: "No records found"} )
    }
    const data = selectRecords.all( { userId, swimmerId, date: result.MaxCreated } )
    return data
  } else {
    const swimmerIds = selectUserSwimmerIds.all( { userId } )
    const totalData = []
    for ( const { swimmerId } of swimmerIds ) {
      const result = selectMaxCreated.get( { userId, swimmerId } )
      if ( result?.MaxCreated ) {
        const data = selectRecords.all( { userId, swimmerId, date: result.MaxCreated } )
        totalData.push( ...data )
      }
    }
    return totalData
  }
} )
