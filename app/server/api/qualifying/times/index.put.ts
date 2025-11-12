import { getPool, prepareStatement, runTransaction, type QualifyingRow } from "lib"

const upsertQualifyingTimesSql = `
INSERT INTO QualifyingTimes (
  year,
  course,
  stroke,
  distance,
  scope,
  area,
  type,
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
  :type,
  :gender,
  :age,
  :timeString,
  :time
)
ON DUPLICATE KEY UPDATE
  time        = :time,
  timeString  = :timeString
;`

const deleteQualifyingTimesSql = `
DELETE FROM QualifyingTimes WHERE
  year = :year AND
  course = :course AND
  stroke = :stroke AND
  distance = :distance AND
  scope = :scope AND
  area = :area AND
  type = :type AND
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
        const upsertQualifyingRow = prepareStatement<QualifyingRow>(
          conn,
          upsertQualifyingTimesSql
        )
        const deleteQualifyingRow = prepareStatement<QualifyingRow>(
          conn,
          deleteQualifyingTimesSql
        )
        await deleteQualifying.run()
        for ( const row of qualifyingData ) {
          if ( row.time ) {
            await upsertQualifyingRow.run( row )
          } else {
            await deleteQualifyingRow.run( row )
          }
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
