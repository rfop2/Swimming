import { getPool, runTransaction, type RowDataPacket } from "lib"

interface ImportRow extends RowDataPacket {
  id: number
  status: string
}

interface TimeChangeRow extends RowDataPacket {
  operation: "insert" | "update"
  year: number
  course: string
  stroke: string
  distance: string
  scope: string
  area: string
  type: string
  gender: string
  age: string
  previousTimeString: string | null
  previousTime: number | string | null
}

interface PeriodChangeRow extends RowDataPacket {
  operation: "insert" | "update"
  year: number
  scope: string
  area: string
  type: string
  previousQualifyingStart: string | null
  previousQualifyingEnd: string | null
  previousLastRaceDate: string | null
}

export default defineEventHandler( async event => {
  if ( !event.context.user || event.context.user.role !== "admin" ) {
    throw createError( { statusCode: 403, statusMessage: "Administrator access required" } )
  }

  const importId = Number( getRouterParam( event, "id" ) )
  if ( !Number.isInteger( importId ) || importId <= 0 ) {
    throw createError( { statusCode: 400, statusMessage: "Invalid import id" } )
  }

  let deletedCount = 0
  let restoredCount = 0
  let periodRestored = false

  await runTransaction( await getPool(), async conn => {
    const [ imports ] = await conn.execute<ImportRow[]>(
      "SELECT id, status FROM QualifyingImports WHERE id = :importId FOR UPDATE",
      { importId }
    )
    const importRecord = imports[0]
    if ( !importRecord ) throw createError( { statusCode: 404, statusMessage: "Import not found" } )
    if ( importRecord.status !== "completed" ) {
      throw createError( { statusCode: 409, statusMessage: "Only completed imports can be rolled back" } )
    }

    const [ changes ] = await conn.execute<TimeChangeRow[]>( `
      SELECT operation, year, course, stroke, distance, scope, area, type, gender, age,
        previousTimeString, previousTime
      FROM QualifyingImportTimeChanges
      WHERE importId = :importId
      ORDER BY id DESC
    `, { importId } )

    for ( const change of changes ) {
      if ( change.operation === "insert" ) {
        const [ result ] = await conn.execute<import( "mysql2/promise" ).ResultSetHeader>( `
          DELETE FROM QualifyingTimes
          WHERE year = :year AND course = :course AND stroke = :stroke AND distance = :distance
            AND scope = :scope AND area = :area AND type = :type AND gender = :gender AND age = :age
        `, change )
        deletedCount += result.affectedRows
      } else {
        const [ result ] = await conn.execute<import( "mysql2/promise" ).ResultSetHeader>( `
          UPDATE QualifyingTimes
          SET timeString = :previousTimeString, time = :previousTime
          WHERE year = :year AND course = :course AND stroke = :stroke AND distance = :distance
            AND scope = :scope AND area = :area AND type = :type AND gender = :gender AND age = :age
        `, change )
        restoredCount += result.affectedRows
      }
    }

    const [ periodChanges ] = await conn.execute<PeriodChangeRow[]>(
      "SELECT * FROM QualifyingImportPeriodChanges WHERE importId = :importId",
      { importId }
    )
    const period = periodChanges[0]
    if ( period?.operation === "insert" ) {
      const [ result ] = await conn.execute<import( "mysql2/promise" ).ResultSetHeader>( `
        DELETE FROM QualifyingPeriods
        WHERE year = :year AND scope = :scope AND area = :area AND type = :type
      `, period )
      periodRestored = result.affectedRows > 0
    } else if ( period ) {
      const [ result ] = await conn.execute<import( "mysql2/promise" ).ResultSetHeader>( `
        UPDATE QualifyingPeriods
        SET qualifyingStart = :previousQualifyingStart,
          qualifyingEnd = :previousQualifyingEnd,
          lastRaceDate = :previousLastRaceDate
        WHERE year = :year AND scope = :scope AND area = :area AND type = :type
      `, period )
      periodRestored = result.affectedRows > 0
    }

    const rolledBackByName = [ event.context.user!.firstName, event.context.user!.lastName ]
      .filter( Boolean ).join( " " ) || event.context.user!.username
    await conn.execute( `
      UPDATE QualifyingImports
      SET status = 'rolled_back', rolledBackAt = NOW(), rolledBackBy = :rolledBackBy,
        rolledBackByName = :rolledBackByName
      WHERE id = :importId
    `, {
      importId,
      rolledBackBy: event.context.user!.id,
      rolledBackByName,
    } )
  } )

  return { importId, deletedCount, restoredCount, periodRestored }
} )
