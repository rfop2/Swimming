import { readFileSync } from "node:fs"
import { createConnection, type RowDataPacket } from "mysql2/promise"
import { expect, test } from "@playwright/test"
import { requireLayout19XlsxPath } from "../swimming-import/layout19Fixture"
import { layout19TestConfig } from "../support/layout19TestConfig"

type ParsedRow = {
  gender: string
  event: string
  distance: string
  stroke: string
  age: string
  time: string | null
}

const sampleKey = ( row: { gender: string, databaseStroke: string, distance: string, age: string } ) =>
  `${row.gender}:${row.databaseStroke}:${row.distance}:${row.age}`

const openDatabase = () => {
  const { database } = layout19TestConfig
  return createConnection( {
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.name,
  } )
}

const seedDifferentValues = async () => {
  const { import: values, samples, sentinel } = layout19TestConfig
  const connection = await openDatabase()

  try {
    await connection.execute( `
      DELETE FROM QualifyingTimes
      WHERE year = ? AND course = ? AND scope = ? AND area = ? AND type = ?
    `, [ values.year, values.course, values.scope, values.area, values.type ] )

    for ( const sample of samples ) {
      await connection.execute( `
        INSERT INTO QualifyingTimes (
          created, year, course, stroke, distance, scope, area, type,
          gender, age, timeString, time
        ) VALUES (CURRENT_DATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        values.year,
        values.course,
        sample.databaseStroke,
        sample.distance,
        values.scope,
        values.area,
        values.type,
        sample.gender,
        sample.age,
        sentinel.timeString,
        sentinel.time,
      ] )
    }
  } finally {
    await connection.end()
  }
}

const readStoredSamples = async () => {
  const { import: values } = layout19TestConfig
  const connection = await openDatabase()

  try {
    const [ rows ] = await connection.execute<RowDataPacket[]>( `
      SELECT gender, stroke, distance, age, timeString, time
      FROM QualifyingTimes
      WHERE year = ? AND course = ? AND scope = ? AND area = ? AND type = ?
      ORDER BY gender, stroke, distance, age
    `, [ values.year, values.course, values.scope, values.area, values.type ] )
    return rows
  } finally {
    await connection.end()
  }
}

test.beforeEach( async () => {
  await seedDifferentValues()
} )

test( "parses the real Wiltshire XLSX and persists three representative rows through the API", async ( { request } ) => {
  const { admin, import: values, samples, sentinel } = layout19TestConfig

  const before = await readStoredSamples()
  expect( before ).toHaveLength( samples.length )
  expect( before.every( row => row.timeString === sentinel.timeString ) ).toBe( true )

  const loginResponse = await request.post( "/api/user/login", {
    headers: { Origin: "http://127.0.0.1:3319" },
    multipart: { username: admin.username, password: admin.password },
  } )
  expect( loginResponse.status(), await loginResponse.text() ).toBe( 204 )

  const workbookBuffer = readFileSync( requireLayout19XlsxPath() )
  const detectionResponse = await request.post( "/api/import/detect", {
    headers: { Origin: "http://127.0.0.1:3319" },
    multipart: {
      import_file: {
        name: "Wiltshire County Qualification Times 2027.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: workbookBuffer,
      },
    },
  } )
  expect( detectionResponse.status(), await detectionResponse.text() ).toBe( 200 )
  expect( await detectionResponse.json() ).toMatchObject( {
    suggestedLayoutId: "layout19",
    confidence: "high",
    detectedYear: 2027,
    dates: {
      qualifyingStart: "2026-05-16",
      qualifyingEnd: "2026-12-16",
    },
  } )

  const parseResponse = await request.post( "/api/import", {
    headers: { Origin: "http://127.0.0.1:3319" },
    multipart: {
      layout: "layout19",
      pdf_file: {
        name: "Wiltshire County Qualification Times 2027.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: workbookBuffer,
      },
    },
  } )
  expect( parseResponse.status(), await parseResponse.text() ).toBe( 200 )

  const parsed = await parseResponse.json() as { structured: ParsedRow[] }
  expect( parsed.structured ).toHaveLength( 288 )

  const rowsToSave = samples.map( sample => {
    const parsedRow = parsed.structured.find( row =>
      row.gender === sample.gender && row.event === sample.event && row.age === sample.age
    )
    expect( parsedRow ).toMatchObject( {
      distance: sample.distance,
      stroke: sample.stroke,
      time: sample.timeString,
    } )

    return {
      created: new Date().toISOString(),
      year: values.year,
      course: values.course,
      scope: values.scope,
      area: values.area,
      type: values.type,
      gender: sample.gender,
      age: sample.age,
      distance: sample.distance,
      stroke: sample.databaseStroke,
      timeString: sample.timeString,
      time: sample.time,
    }
  } )

  const saveResponse = await request.put( "/api/import", {
    headers: { Origin: "http://127.0.0.1:3319" },
    data: rowsToSave,
  } )
  expect( saveResponse.status(), await saveResponse.text() ).toBe( 204 )

  const after = await readStoredSamples()
  expect( after ).toHaveLength( samples.length )
  const storedByKey = new Map( after.map( row => [ `${row.gender}:${row.stroke}:${row.distance}:${row.age}`, row ] ) )

  for ( const sample of samples ) {
    const stored = storedByKey.get( sampleKey( sample ) )
    expect( stored?.timeString ).toBe( sample.timeString )
    expect( Number( stored?.time ) ).toBe( sample.time )
    expect( stored?.timeString ).not.toBe( sentinel.timeString )
  }
} )
