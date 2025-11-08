import { getPool, prepareStatement, type QualifyingRow } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const selectRecords = prepareStatement<unknown[], QualifyingRow>(
    await getPool(),
    "SELECT * FROM QualifyingTimes"
  )

  const data = selectRecords.all()
  return data
} )
