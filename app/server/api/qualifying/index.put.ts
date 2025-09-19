import { format } from "date-fns"
import { getPool, prepareStatement, runTransaction, type QualifyingRow } from "lib"

export default eventHandler( async ( event ) => {
  if ( !event.context.session ) {
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
          "DELETE FROM Qualifying"
        )
        const updateQualifyingRow = prepareStatement<QualifyingRow>(
          conn,
`INSERT INTO Qualifying (
  created,
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
  :created,
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
        )
        await deleteQualifying.run()
        for ( const row of qualifyingData ) {
          row.created = format( row.created, "yyyy-MM-dd" )
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
