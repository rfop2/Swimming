import { getPool, prepareStatement, runTransaction, type QualifyingRow } from "lib"

const deleteQualifyingTimesSql = `
  DELETE FROM QualifyingTimes WHERE
    year = :year AND
    course = :course AND
    stroke = :stroke AND
    distance = :distance AND
    scope = :scope AND
    area = :area AND
    type = :type
  ;`

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const userId = getRouterParam( event, "id" )
  if ( userId && event.context.user.role !== "admin" ) {
    throw createError( {
      status: 403
    } )
  }

  try {
    const deleteData = await readBody( event )
    await runTransaction(
      await getPool(),
      async( conn, qualifyingData: Array<QualifyingRow> ) => {
        const deleteQualifyingRow = prepareStatement<QualifyingRow>(
          conn,
          deleteQualifyingTimesSql
        )
        for ( const row of qualifyingData ) {
          await deleteQualifyingRow.run( row )
        }
      },
      deleteData
    )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to delete qualifying times",
      status: 500
    } )
  }
} )
