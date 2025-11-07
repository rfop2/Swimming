import { getPool, prepareStatement, type QualifyingPeriodRow } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const selectRecords = prepareStatement<unknown, QualifyingPeriodRow>(
    await getPool(),
    "SELECT * FROM QualifyingPeriods"
  )

  return selectRecords.all()
} )
