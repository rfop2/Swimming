import type { Statement } from "better-sqlite3"
import type { QualifyingRow } from "lib"
import { db } from "~/server/utils/db"

const deleteQualifying: Statement<unknown[],void> = db.prepare( "DELETE FROM Qualifying" )

const updateQualifyingRow: Statement<QualifyingRow> = db.prepare(
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
ON CONFLICT(year,course,stroke,distance,scope,area,gender,age) DO UPDATE SET
  time        = excluded.time,
  timeString  = excluded.timeString
;` )

const updateQualifying = db.transaction( ( qualifyingData: Array<QualifyingRow> ) => {
  deleteQualifying.run()
  for ( const row of qualifyingData ) {
    updateQualifyingRow.run( row )
  }
} )

export default eventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      statusCode: 403
    } )
  }

  try {
    const saveData = await readBody( event )
    updateQualifying( saveData )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update qualifying times",
      statusCode: 500
    } )
  }
} )
