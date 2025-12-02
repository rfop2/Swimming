import { format } from "date-fns"
import { getPool, prepareStatement, runTransaction } from "lib"

export default eventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( { statusCode: 403 } )
  }

  try {
    const saveData = await readBody( event )

    await runTransaction(
      await getPool(),
      async ( conn, importData ) => {
        const insertRow = prepareStatement(
          conn,
          `INSERT INTO QualifyingTimes (
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
            time,
            type
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
            :time,
            :type
          )
          ON DUPLICATE KEY UPDATE
            timeString = :timeString,
            time = :time
          ;`
        )

        for ( const row of importData ) {
          row.created = format( row.created, "yyyy-MM-dd" )
          await insertRow.run( row )
        }
      },
      saveData
    )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to import qualifying times",
      statusCode: 500
    } )
  }
} )
