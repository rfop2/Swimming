import { readFileSync } from "node:fs"
import { createConnection, type RowDataPacket } from "mysql2/promise"
import { expect, test } from "@playwright/test"
import { requireLayout17PdfPath } from "../swimming-import/layout17Fixture"
import { layout17TestConfig } from "../support/layout17TestConfig"

type ParsedRow = {
  gender: string
  course: string
  event: string
  distance: string
  stroke: string
  age: string
  time: string | null
}

const sampleKey = ( row: { gender: string, course: string, databaseStroke: string, distance: string, age: string } ) =>
  `${row.gender}:${row.course}:${row.databaseStroke}:${row.distance}:${row.age}`

const openDatabase = () => {
  const { database } = layout17TestConfig
  return createConnection( {
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.name,
  } )
}

const seedDifferentValues = async () => {
  const { import: values, samples, sentinel } = layout17TestConfig
  const connection = await openDatabase()

  try {
    await connection.execute( `
      DELETE FROM QualifyingTimes
      WHERE year = ? AND scope = ? AND area = ? AND type = ? AND course IN ('lc', 'sc')
    `, [ values.year, values.scope, values.area, values.type ] )

    for ( const sample of samples ) {
      await connection.execute( `
        INSERT INTO QualifyingTimes (
          created, year, course, stroke, distance, scope, area, type,
          gender, age, timeString, time
        ) VALUES (CURRENT_DATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        values.year,
        sample.course,
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
  const { import: values } = layout17TestConfig
  const connection = await openDatabase()

  try {
    const [ rows ] = await connection.execute<RowDataPacket[]>( `
      SELECT gender, course, stroke, distance, age, timeString, time
      FROM QualifyingTimes
      WHERE year = ? AND scope = ? AND area = ? AND type = ? AND course IN ('lc', 'sc')
      ORDER BY gender, course, stroke, distance, age
    `, [ values.year, values.scope, values.area, values.type ] )

    return rows
  } finally {
    await connection.end()
  }
}

test.beforeEach( async () => {
  await seedDifferentValues()
} )

test( "parses the real Surrey PDF and persists long- and short-course samples through the API", async ( { request } ) => {
  const { admin, import: values, samples, sentinel } = layout17TestConfig

  const before = await readStoredSamples()
  expect( before ).toHaveLength( samples.length )
  expect( before.every( row => row.timeString === sentinel.timeString ) ).toBe( true )

  const loginResponse = await request.post( "/api/user/login", {
    headers: { Origin: "http://127.0.0.1:3319" },
    multipart: {
      username: admin.username,
      password: admin.password,
    },
  } )
  expect( loginResponse.status(), await loginResponse.text() ).toBe( 204 )

  const parseResponse = await request.post( "/api/import", {
    headers: { Origin: "http://127.0.0.1:3319" },
    multipart: {
      layout: "layout17",
      pdf_file: {
        name: "Surrey - Qualifying-and-Consideration-Times-2027-v1.pdf",
        mimeType: "application/pdf",
        buffer: readFileSync( requireLayout17PdfPath() ),
      },
    },
  } )
  expect( parseResponse.status(), await parseResponse.text() ).toBe( 200 )

  const parsed = await parseResponse.json() as { structured: ParsedRow[] }
  expect( parsed.structured ).toHaveLength( 612 )

  const rowsToSave = samples.map( sample => {
    const parsedRow = parsed.structured.find( row =>
      row.gender === sample.gender &&
      row.course === sample.course &&
      row.event === sample.event &&
      row.age === sample.age
    )

    expect( parsedRow ).toMatchObject( {
      distance: sample.distance,
      stroke: sample.stroke,
      time: sample.timeString,
    } )

    return {
      created: new Date().toISOString(),
      year: values.year,
      course: sample.course,
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

  const storedByKey = new Map( after.map( row => [
    `${row.gender}:${row.course}:${row.stroke}:${row.distance}:${row.age}`,
    row,
  ] ) )

  for ( const sample of samples ) {
    const stored = storedByKey.get( sampleKey( sample ) )
    expect( stored?.timeString ).toBe( sample.timeString )
    expect( Number( stored?.time ) ).toBe( sample.time )
    expect( stored?.timeString ).not.toBe( sentinel.timeString )
  }
} )
