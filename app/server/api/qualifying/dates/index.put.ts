import { type QualifyingPeriodRow, getPool, prepareStatement, runTransaction } from "lib"

const upsertQualifyingPeriodsSql = `
INSERT INTO QualifyingPeriods (
  qualifyingYear,
  qualifyingScope,
  qualifyingArea,
  qualifyingType,
  qualifyingStart,
  qualifyingEnd
)
VALUES (
  :qualifyingYear,
  :qualifyingScope,
  :qualifyingArea,
  :qualifyingType,
  :qualifyingStart,
  :qualifyingEnd
)
ON DUPLICATE KEY UPDATE
  qualifyingStart = :qualifyingStart,
  qualifyingEnd   = :qualifyingEnd
;`

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const userId = getRouterParam( event, "id" )
  if ( userId && !Number( event.context.user.admin ) ) {
    throw createError( {
      status: 403
    } )
  }

  try {
    const saveData = await readBody( event )
    await runTransaction(
      await getPool(),
      async( conn, qualifyingData: Array<QualifyingPeriodRow> ) => {
        /* const deleteQualifying = prepareStatement(
          conn,
          "DELETE FROM QualifyingPeriods"
        ) */
        const upsertQualifyingPeriodsRow = prepareStatement<QualifyingPeriodRow>(
          conn,
          upsertQualifyingPeriodsSql
        )
        // await deleteQualifying.run()
        for ( const row of qualifyingData ) {
          await upsertQualifyingPeriodsRow.run( row )
        }
      },
      saveData
    )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update qualifying dates",
      status: 500
    } )
  }
} )
