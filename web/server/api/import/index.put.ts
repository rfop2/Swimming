import { format } from "date-fns"
import { getPool, prepareStatement, runTransaction, type PoolConnection, type RowDataPacket } from "lib"

interface ImportRow {
  created: Date | string
  year: number
  course: string
  stroke: string
  distance: string
  scope: string
  area: string
  gender: string
  age: string
  timeString: string
  time: number
  type: string
}

interface ImportPeriod {
  year: number
  scope: string
  area: string
  type: string
  qualifyingStart: string | null
  qualifyingEnd: string | null
  lastRaceDate: string | null
}

interface AuditedImportPayload {
  metadata: {
    filename: string
    layoutId?: string | null
    layoutName?: string | null
    year: number
    scope: string
    area: string
    type: string
    course: string
  }
  period?: ImportPeriod | null
  rows: ImportRow[]
}

interface ExistingTimeRow extends RowDataPacket {
  type: string
  timeString: string
  time: number | string
}

interface ExistingPeriodRow extends RowDataPacket {
  qualifyingStart: string | null
  qualifyingEnd: string | null
  lastRaceDate: string | null
}

const upsertTimeSql = `
  INSERT INTO QualifyingTimes (
    created, year, course, stroke, distance, scope, area, gender, age, timeString, time, type
  ) VALUES (
    :created, :year, :course, :stroke, :distance, :scope, :area, :gender, :age, :timeString, :time, :type
  )
  ON DUPLICATE KEY UPDATE
    timeString = :timeString,
    time = :time
`

const upsertPeriodSql = `
  INSERT INTO QualifyingPeriods (
    year, scope, area, type, qualifyingStart, qualifyingEnd, lastRaceDate
  ) VALUES (
    :year, :scope, :area, :type, :qualifyingStart, :qualifyingEnd, :lastRaceDate
  )
  ON DUPLICATE KEY UPDATE
    qualifyingStart = :qualifyingStart,
    qualifyingEnd = :qualifyingEnd,
    lastRaceDate = :lastRaceDate
`

const normalizeCreated = ( value: Date | string ) => format( new Date( value ), "yyyy-MM-dd" )

const importerName = ( user: { firstName?: string, lastName?: string, username?: string } ) =>
  [ user.firstName, user.lastName ].filter( Boolean ).join( " " ) || user.username || "Unknown user"

async function saveLegacyImport( conn: PoolConnection, rows: ImportRow[] ) {
  const insertRow = prepareStatement<ImportRow>( conn, upsertTimeSql )
  for ( const row of rows ) {
    await insertRow.run( { ...row, created: normalizeCreated( row.created ) } )
  }
}

export default eventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { statusCode: 403, statusMessage: "Authentication required" } )
  }

  const body = await readBody<AuditedImportPayload | ImportRow[]>( event )
  const pool = await getPool()

  // Keep support for older callers and integration tests. New UI imports always use the audited payload below.
  if ( Array.isArray( body ) ) {
    try {
      await runTransaction( pool, saveLegacyImport, body )
      return { audited: false, totalCount: body.length }
    } catch ( error ) {
      console.error( error )
      throw createError( { message: "Unable to import qualifying times", statusCode: 500 } )
    }
  }

  if ( !body?.metadata || !Array.isArray( body.rows ) || !body.rows.length ) {
    throw createError( { statusCode: 400, statusMessage: "Import metadata and qualifying times are required" } )
  }

  const { metadata, period } = body
  const deduplicatedRows = new Map<string, ImportRow>()
  for ( const row of body.rows ) {
    if ( !row.course ) throw createError( { statusCode: 400, statusMessage: "Every qualifying time must have a course" } )
    const key = [ row.year, row.course, row.stroke, row.distance, row.scope, row.area, row.gender, row.age ].join( "|" )
    deduplicatedRows.set( key, row )
  }
  const rows = [ ...deduplicatedRows.values() ]

  let importId = 0
  let insertedCount = 0
  let updatedCount = 0
  const importedByName = importerName( event.context.user )

  try {
    await runTransaction( pool, async conn => {
      const [ importResult ] = await conn.execute<import( "mysql2/promise" ).ResultSetHeader>( `
        INSERT INTO QualifyingImports (
          filename, layoutId, layoutName, year, scope, area, type, course,
          qualifyingStart, qualifyingEnd, lastRaceDate, importedBy, importedByName,
          status, totalCount
        ) VALUES (
          :filename, :layoutId, :layoutName, :year, :scope, :area, :type, :course,
          :qualifyingStart, :qualifyingEnd, :lastRaceDate, :importedBy, :importedByName,
          'pending', :totalCount
        )
      `, {
        ...metadata,
        layoutId: metadata.layoutId ?? null,
        layoutName: metadata.layoutName ?? null,
        qualifyingStart: period?.qualifyingStart ?? null,
        qualifyingEnd: period?.qualifyingEnd ?? null,
        lastRaceDate: period?.lastRaceDate ?? null,
        importedBy: event.context.user!.id,
        importedByName,
        totalCount: rows.length,
      } )
      importId = importResult.insertId

      if ( period ) {
        const [ existingPeriods ] = await conn.execute<ExistingPeriodRow[]>( `
          SELECT qualifyingStart, qualifyingEnd, lastRaceDate
          FROM QualifyingPeriods
          WHERE year = :year AND scope = :scope AND area = :area AND type = :type
          FOR UPDATE
        `, period )
        const previous = existingPeriods[0]

        await conn.execute( `
          INSERT INTO QualifyingImportPeriodChanges (
            importId, operation, year, scope, area, type,
            previousQualifyingStart, previousQualifyingEnd, previousLastRaceDate,
            importedQualifyingStart, importedQualifyingEnd, importedLastRaceDate
          ) VALUES (
            :importId, :operation, :year, :scope, :area, :type,
            :previousQualifyingStart, :previousQualifyingEnd, :previousLastRaceDate,
            :importedQualifyingStart, :importedQualifyingEnd, :importedLastRaceDate
          )
        `, {
          importId,
          operation: previous ? "update" : "insert",
          ...period,
          previousQualifyingStart: previous?.qualifyingStart ?? null,
          previousQualifyingEnd: previous?.qualifyingEnd ?? null,
          previousLastRaceDate: previous?.lastRaceDate ?? null,
          importedQualifyingStart: period.qualifyingStart,
          importedQualifyingEnd: period.qualifyingEnd,
          importedLastRaceDate: period.lastRaceDate,
        } )
        await conn.execute( upsertPeriodSql, period )
      }

      for ( const rawRow of rows ) {
        const row = { ...rawRow, created: normalizeCreated( rawRow.created ) }
        const [ existingRows ] = await conn.execute<ExistingTimeRow[]>( `
          SELECT type, timeString, time
          FROM QualifyingTimes
          WHERE year = :year AND course = :course AND stroke = :stroke AND distance = :distance
            AND scope = :scope AND area = :area AND gender = :gender AND age = :age
          FOR UPDATE
        `, row )
        const previous = existingRows[0]
        const effectiveType = previous?.type ?? row.type
        if ( previous ) updatedCount += 1
        else insertedCount += 1

        await conn.execute( `
          INSERT INTO QualifyingImportTimeChanges (
            importId, operation, year, course, stroke, distance, scope, area, type, gender, age,
            previousTimeString, previousTime, importedTimeString, importedTime
          ) VALUES (
            :importId, :operation, :year, :course, :stroke, :distance, :scope, :area, :type, :gender, :age,
            :previousTimeString, :previousTime, :importedTimeString, :importedTime
          )
        `, {
          importId,
          operation: previous ? "update" : "insert",
          ...row,
          type: effectiveType,
          previousTimeString: previous?.timeString ?? null,
          previousTime: previous?.time ?? null,
          importedTimeString: row.timeString,
          importedTime: row.time,
        } )
        await conn.execute( upsertTimeSql, row )
      }

      await conn.execute( `
        UPDATE QualifyingImports
        SET status = 'completed', insertedCount = :insertedCount, updatedCount = :updatedCount,
            completedAt = NOW()
        WHERE id = :importId
      `, { importId, insertedCount, updatedCount } )
    } )

    return { audited: true, importId, totalCount: rows.length, insertedCount, updatedCount }
  } catch ( error ) {
    console.error( error )
    try {
      await pool.execute( `
        INSERT INTO QualifyingImports (
          filename, layoutId, layoutName, year, scope, area, type, course,
          qualifyingStart, qualifyingEnd, lastRaceDate, importedBy, importedByName,
          status, totalCount, errorMessage
        ) VALUES (
          :filename, :layoutId, :layoutName, :year, :scope, :area, :type, :course,
          :qualifyingStart, :qualifyingEnd, :lastRaceDate, :importedBy, :importedByName,
          'failed', :totalCount, :errorMessage
        )
      `, {
        ...metadata,
        layoutId: metadata.layoutId ?? null,
        layoutName: metadata.layoutName ?? null,
        qualifyingStart: period?.qualifyingStart ?? null,
        qualifyingEnd: period?.qualifyingEnd ?? null,
        lastRaceDate: period?.lastRaceDate ?? null,
        importedBy: event.context.user.id,
        importedByName,
        totalCount: rows.length,
        errorMessage: error instanceof Error ? error.message.slice( 0, 2000 ) : "Unknown import error",
      } )
    } catch ( auditError ) {
      console.error( "Unable to record failed qualifying import", auditError )
    }
    throw createError( { message: "Unable to import qualifying times", statusCode: 500 } )
  }
} )
