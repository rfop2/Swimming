import { createConnection, type RowDataPacket } from "mysql2/promise"
import { expect, test } from "@playwright/test"
import { layout7TestConfig } from "../support/layout7TestConfig"

const values = {
  year: 2099,
  course: "sc",
  scope: "county",
  area: "AUDIT_TEST",
  type: "general",
} as const

const openDatabase = () => {
  const { database } = layout7TestConfig
  return createConnection( {
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.name,
  } )
}

test.beforeEach( async () => {
  const connection = await openDatabase()
  try {
    await connection.execute( "DELETE FROM QualifyingImports WHERE year = ? AND area = ?", [ values.year, values.area ] )
    await connection.execute( "DELETE FROM QualifyingTimes WHERE year = ? AND area = ?", [ values.year, values.area ] )
    await connection.execute( "DELETE FROM QualifyingPeriods WHERE year = ? AND area = ?", [ values.year, values.area ] )
    await connection.execute( `
      INSERT INTO QualifyingPeriods (
        year, scope, area, type, qualifyingStart, qualifyingEnd, lastRaceDate
      ) VALUES (?, ?, ?, ?, '2098-01-01', '2098-12-01', '2098-12-15')
    `, [ values.year, values.scope, values.area, values.type ] )
    await connection.execute( `
      INSERT INTO QualifyingTimes (
        year, course, stroke, distance, scope, area, type, gender, age, timeString, time
      ) VALUES (?, ?, 'freestyle', '50m', ?, ?, ?, 'male', '10', '99.99', 99.99)
    `, [ values.year, values.course, values.scope, values.area, values.type ] )
  } finally {
    await connection.end()
  }
} )

test( "audits an import and restores inserted, updated and period values on rollback", async ( { request } ) => {
  const unauthorized = await request.get( "/api/import/history" )
  expect( unauthorized.status() ).toBe( 403 )

  const { admin } = layout7TestConfig
  const login = await request.post( "/api/user/login", {
    headers: { Origin: "http://127.0.0.1:3324" },
    multipart: { username: admin.username, password: admin.password },
  } )
  expect( login.status(), await login.text() ).toBe( 204 )

  const importResponse = await request.put( "/api/import", {
    headers: { Origin: "http://127.0.0.1:3324" },
    data: {
      metadata: {
        filename: "audit-test.pdf",
        layoutId: "layout-test",
        layoutName: "Audit test",
        ...values,
      },
      period: {
        year: values.year,
        scope: values.scope,
        area: values.area,
        type: values.type,
        qualifyingStart: "2099-01-01",
        qualifyingEnd: "2099-12-01",
        lastRaceDate: "2099-12-15",
      },
      rows: [
        {
          created: "2099-01-01",
          ...values,
          stroke: "freestyle",
          distance: "50m",
          gender: "male",
          age: "10",
          timeString: "30.00",
          time: 30,
        },
        {
          created: "2099-01-01",
          ...values,
          stroke: "backstroke",
          distance: "100m",
          gender: "female",
          age: "11",
          timeString: "1:15.00",
          time: 75,
        },
      ],
    },
  } )
  expect( importResponse.status(), await importResponse.text() ).toBe( 200 )
  const imported = await importResponse.json() as { importId: number, insertedCount: number, updatedCount: number }
  expect( imported ).toMatchObject( { insertedCount: 1, updatedCount: 1 } )

  const historyResponse = await request.get( `/api/import/history/${imported.importId}` )
  expect( historyResponse.status(), await historyResponse.text() ).toBe( 200 )
  const history = await historyResponse.json() as { import: { status: string, filename: string }, timeChanges: unknown[] }
  expect( history.import ).toMatchObject( { status: "completed", filename: "audit-test.pdf" } )
  expect( history.timeChanges ).toHaveLength( 2 )

  const rollbackResponse = await request.post( `/api/import/history/${imported.importId}/rollback`, {
    headers: { Origin: "http://127.0.0.1:3324" },
  } )
  expect( rollbackResponse.status(), await rollbackResponse.text() ).toBe( 200 )
  expect( await rollbackResponse.json() ).toMatchObject( { deletedCount: 1, restoredCount: 1, periodRestored: true } )

  const connection = await openDatabase()
  try {
    const [ times ] = await connection.execute<RowDataPacket[]>( `
      SELECT stroke, timeString FROM QualifyingTimes
      WHERE year = ? AND area = ? ORDER BY stroke
    `, [ values.year, values.area ] )
    expect( times ).toHaveLength( 1 )
    expect( times[0] ).toMatchObject( { stroke: "freestyle", timeString: "99.99" } )

    const [ periods ] = await connection.execute<RowDataPacket[]>( `
      SELECT DATE_FORMAT(qualifyingStart, '%Y-%m-%d') AS qualifyingStart,
        DATE_FORMAT(qualifyingEnd, '%Y-%m-%d') AS qualifyingEnd,
        DATE_FORMAT(lastRaceDate, '%Y-%m-%d') AS lastRaceDate
      FROM QualifyingPeriods WHERE year = ? AND area = ?
    `, [ values.year, values.area ] )
    expect( periods[0] ).toMatchObject( {
      qualifyingStart: "2098-01-01",
      qualifyingEnd: "2098-12-01",
      lastRaceDate: "2098-12-15",
    } )
  } finally {
    await connection.end()
  }
} )
