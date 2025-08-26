import type { Statement } from "better-sqlite3"
import type { QualifyingRow } from "lib"
import { db } from "~/server/utils/db"

const updateQualifying: Statement<QualifyingRow> = db.prepare(
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

export default eventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      statusCode: 403
    } )
  }

  try {
    const saveData = await readBody( event )
    for ( const row of saveData ) {
      updateQualifying.run( row )
    }
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update qualifying times",
      statusCode: 500
    } )
  }
} )
