import { defineEventHandler } from "h3"
import { getPool, prepareStatement, type QualifyingRow } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      status: 401
    } )
  }

  const selectRecords = prepareStatement<unknown[], QualifyingRow>(
    await getPool(),
    "SELECT * FROM Qualifying"
  )

  const data = selectRecords.all()
  return data
} )
