import { db } from "~/server/utils/db"

export default eventHandler( async ( event ) => {
  try {
    const saveData = await readBody( event )
    const sql = "UPDATE Qualifying SET time = :time, timeString = :timeString WHERE year = :year AND course = :course AND stroke = :stroke AND distance = :distance AND area = :area AND gender = :gender AND age = :age"
    const updateRow = db.prepare( sql )
    for ( const row of saveData ) {
    console.log( row )
      updateRow.run( row )
    }
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update qualifying times",
      statusCode: 500
    } )
  }
} )
