import { getPool, prepareStatement, runTransaction, type QualifyingRow } from "lib"

const insertQualifyingTimesSql = `
INSERT INTO QualifyingTimes (
  year,
  course,
  stroke,
  distance,
  scope,
  area,
  gender,
  age,
  timeString,
  time
)
VALUES (
  :year,
  :course,
  :stroke,
  :distance,
  :scope,
  :area,
  :gender,
  :age,
  :timeString,
  :time
)
ON DUPLICATE KEY UPDATE
  time        = :time,
  timeString  = :timeString
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
      async( conn, qualifyingData: Array<QualifyingRow> ) => {
        const deleteQualifying = prepareStatement(
          conn,
          "DELETE FROM QualifyingTimes"
        )
        const updateQualifyingRow = prepareStatement<QualifyingRow>(
          conn,
          insertQualifyingTimesSql
        )
        await deleteQualifying.run()
        for ( const row of qualifyingData ) {
          await updateQualifyingRow.run( row )
        }
      },
      saveData
    )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update qualifying times",
      status: 500
    } )
  }
} )
