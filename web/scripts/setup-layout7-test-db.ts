import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { hash } from "@node-rs/argon2"
import { createConnection, type RowDataPacket } from "mysql2/promise"
import { layout7TestConfig } from "../tests/support/layout7TestConfig"

type TableRow = RowDataPacket & {
  tableName: string
  tableType: "BASE TABLE" | "VIEW"
}

type CreateRow = RowDataPacket & {
  "Create Table"?: string
  "Create View"?: string
}

const quoteIdentifier = ( value: string ) => `\`${value.replaceAll( "`", "``" )}\``

const assertSafeDatabaseNames = ( source: string, target: string ) => {
  if ( source === target ) throw new Error( "Source and test database names must be different." )
  if ( !/^swimming_layout7_test(?:_[a-z0-9_]+)?$/i.test( target ) ) {
    throw new Error( `Unsafe layout 7 test database name: ${target}` )
  }
}

export async function setupLayout7TestDatabase() {
  const { database, admin, import: importValues, sentinel } = layout7TestConfig
  assertSafeDatabaseNames( database.sourceName, database.name )
  if ( !database.rootPassword ) throw new Error( "MARIADB_ROOT_PASSWORD is required." )

  const connection = await createConnection( {
    host: database.host,
    port: database.port,
    user: "root",
    password: database.rootPassword,
    multipleStatements: true,
  } )

  const source = quoteIdentifier( database.sourceName )
  const target = quoteIdentifier( database.name )

  try {
    const [ sourceExists ] = await connection.query<RowDataPacket[]>(
      "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
      [ database.sourceName ]
    )
    if ( sourceExists.length !== 1 ) throw new Error( `Source database not found: ${database.sourceName}` )

    await connection.query( `DROP DATABASE IF EXISTS ${target}` )
    await connection.query( `CREATE DATABASE ${target} CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci` )
    await connection.query( `USE ${target}` )
    await connection.query( "SET FOREIGN_KEY_CHECKS = 0" )

    const [ objects ] = await connection.query<TableRow[]>( `
      SELECT TABLE_NAME AS tableName, TABLE_TYPE AS tableType
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_TYPE, TABLE_NAME
    `, [ database.sourceName ] )

    for ( const object of objects.filter( item => item.tableType === "BASE TABLE" ) ) {
      const table = quoteIdentifier( object.tableName )
      const [ createRows ] = await connection.query<CreateRow[]>( `SHOW CREATE TABLE ${source}.${table}` )
      const createSql = createRows[0]?.["Create Table"]
      if ( !createSql ) throw new Error( `Unable to copy table definition: ${object.tableName}` )
      await connection.query( createSql )
      const [ columns ] = await connection.query<Array<RowDataPacket & { columnName: string }>>( `
        SELECT COLUMN_NAME AS columnName
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND EXTRA NOT LIKE '%GENERATED%'
        ORDER BY ORDINAL_POSITION
      `, [ database.sourceName, object.tableName ] )
      const columnList = columns.map( column => quoteIdentifier( column.columnName ) ).join( ", " )
      await connection.query( `
        INSERT INTO ${target}.${table} (${columnList})
        SELECT ${columnList} FROM ${source}.${table}
      ` )
    }

    for ( const object of objects.filter( item => item.tableType === "VIEW" ) ) {
      const view = quoteIdentifier( object.tableName )
      const [ createRows ] = await connection.query<CreateRow[]>( `SHOW CREATE VIEW ${source}.${view}` )
      const createSql = createRows[0]?.["Create View"]
      if ( !createSql ) throw new Error( `Unable to copy view definition: ${object.tableName}` )
      await connection.query( createSql.replaceAll( `${source}.`, `${target}.` ) )
    }

    await connection.query( "SET FOREIGN_KEY_CHECKS = 1" )

    const [ roleColumns ] = await connection.query<RowDataPacket[]>( `
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'User' AND COLUMN_NAME = 'role'
    `, [ database.name ] )
    if ( roleColumns.length === 0 ) {
      const roleMigration = await readFile(
        resolve( process.cwd(), "../data/migrations/20260402_001_user_role.sql" ),
        "utf8"
      )
      await connection.query( roleMigration )
    }

    const [ raceDateColumns ] = await connection.query<RowDataPacket[]>( `
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'QualifyingPeriods' AND COLUMN_NAME = 'lastRaceDate'
    `, [ database.name ] )
    if ( raceDateColumns.length === 0 ) {
      const raceDateMigration = await readFile(
        resolve( process.cwd(), "../data/migrations/20260706_002_qualifying_last_race_date.sql" ),
        "utf8"
      )
      await connection.query( raceDateMigration )
    }

    const [ importHistoryTables ] = await connection.query<RowDataPacket[]>( `
      SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'QualifyingImports'
    `, [ database.name ] )
    if ( importHistoryTables.length === 0 ) {
      const importHistoryMigration = await readFile(
        resolve( process.cwd(), "../data/migrations/20260917_001_qualifying_import_history.sql" ),
        "utf8"
      )
      await connection.query( importHistoryMigration )
    }

    const passwordHash = await hash( admin.password )
    await connection.execute( `
      INSERT INTO User (
        id, username, password_hash, firstName, lastName, phone, role, location, status
      ) VALUES (?, ?, ?, 'Layout 7', 'Test Admin', '', 'admin', 'Test only', 'active')
      ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        role = 'admin',
        status = 'active'
    `, [ admin.id, admin.username, passwordHash ] )
    await connection.execute( "DELETE FROM Session WHERE user_id = ?", [ admin.id ] )
    await connection.execute( "DELETE FROM QualifyingImports" )
    await connection.execute( `
      DELETE FROM QualifyingTimes
      WHERE year = ? AND course = ? AND scope = ? AND area = ? AND type = ?
    `, [
      importValues.year,
      importValues.course,
      importValues.scope,
      importValues.area,
      importValues.type,
    ] )

    await connection.execute( `
      INSERT INTO QualifyingPeriods (
        year, scope, area, type, qualifyingStart, qualifyingEnd, lastRaceDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        qualifyingStart = VALUES(qualifyingStart),
        qualifyingEnd = VALUES(qualifyingEnd),
        lastRaceDate = VALUES(lastRaceDate)
    `, [
      importValues.year,
      importValues.scope,
      importValues.area,
      importValues.type,
      sentinel.qualifyingStart,
      sentinel.qualifyingEnd,
      sentinel.lastRaceDate,
    ] )

    await connection.execute( `
      INSERT INTO QualifyingTimes (
        year, course, stroke, distance, scope, area, type, gender, age, timeString, time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        timeString = VALUES(timeString),
        time = VALUES(time)
    `, [
      importValues.year,
      importValues.course,
      layout7TestConfig.expected.stroke,
      layout7TestConfig.expected.distance,
      importValues.scope,
      importValues.area,
      importValues.type,
      layout7TestConfig.expected.gender,
      layout7TestConfig.expected.age,
      sentinel.timeString,
      sentinel.time,
    ] )

    await connection.query(
      `GRANT ALL PRIVILEGES ON ${target}.* TO ?@'%'`,
      [ database.user ]
    )
    await connection.query( "FLUSH PRIVILEGES" )

    const [ seededTimes ] = await connection.execute<RowDataPacket[]>( `
      SELECT timeString, time FROM QualifyingTimes
      WHERE year = ? AND course = ? AND stroke = ? AND distance = ?
        AND scope = ? AND area = ? AND type = ? AND gender = ? AND age = ?
    `, [
      importValues.year,
      importValues.course,
      layout7TestConfig.expected.stroke,
      layout7TestConfig.expected.distance,
      importValues.scope,
      importValues.area,
      importValues.type,
      layout7TestConfig.expected.gender,
      layout7TestConfig.expected.age,
    ] )
    const [ seededPeriods ] = await connection.execute<RowDataPacket[]>( `
      SELECT qualifyingStart, qualifyingEnd, lastRaceDate FROM QualifyingPeriods
      WHERE year = ? AND scope = ? AND area = ? AND type = ?
    `, [ importValues.year, importValues.scope, importValues.area, importValues.type ] )

    if ( String( seededTimes[0]?.timeString ) !== sentinel.timeString ) {
      throw new Error( "The test qualifying-time sentinel was not created." )
    }
    if ( String( seededPeriods[0]?.qualifyingStart ).slice( 0, 10 ) === importValues.qualifyingStart ) {
      throw new Error( "The test qualifying-period sentinel must differ from the imported period." )
    }

    console.log( `Layout 7 test database ready: ${database.name}` )
    console.log( `Sentinel time before import: ${sentinel.timeString}` )
    console.log( `Expected time after import: ${layout7TestConfig.expected.timeString}` )
  } finally {
    await connection.end()
  }
}

setupLayout7TestDatabase().catch( ( error ) => {
  console.error( error )
  process.exitCode = 1
} )
