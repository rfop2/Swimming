import { getPool, prepareStatement, type RowDataPacket } from "lib"

interface ImportDetail extends RowDataPacket {
  id: number
}

export default defineEventHandler( async event => {
  if ( !event.context.user || event.context.user.role !== "admin" ) {
    throw createError( { statusCode: 403, statusMessage: "Administrator access required" } )
  }

  const id = Number( getRouterParam( event, "id" ) )
  if ( !Number.isInteger( id ) || id <= 0 ) {
    throw createError( { statusCode: 400, statusMessage: "Invalid import id" } )
  }

  const pool = await getPool()
  const selectImport = prepareStatement<{ id: number }, ImportDetail>( pool, "SELECT * FROM QualifyingImports WHERE id = :id" )
  const importRecord = await selectImport.get( { id } )
  if ( !importRecord ) throw createError( { statusCode: 404, statusMessage: "Import not found" } )

  const selectPeriod = prepareStatement<{ id: number }, RowDataPacket>( pool,
    "SELECT * FROM QualifyingImportPeriodChanges WHERE importId = :id" )
  const selectChanges = prepareStatement<{ id: number }, RowDataPacket>( pool, `
    SELECT id, operation, year, course, stroke, distance, scope, area, type, gender, age,
      previousTimeString, previousTime, importedTimeString, importedTime
    FROM QualifyingImportTimeChanges
    WHERE importId = :id
    ORDER BY course, gender, stroke, distance, age
  ` )

  return {
    import: importRecord,
    periodChange: await selectPeriod.get( { id } ) ?? null,
    timeChanges: await selectChanges.all( { id } ),
  }
} )
