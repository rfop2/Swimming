import { readFileSync } from "node:fs"
import { createConnection, type RowDataPacket } from "mysql2/promise"
import { expect, test } from "@playwright/test"
import { requireLayout25PdfPath } from "../swimming-import/layout25Fixture"
import { layout25TestConfig } from "../support/layout25TestConfig"

type ParsedRow = { gender: string, course: string, event: string, distance: string, stroke: string, age: string, time: string }

const openDatabase = () => {
  const { database } = layout25TestConfig
  return createConnection( {
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.name,
  } )
}

const seedDifferentValues = async () => {
  const { import: values, samples, sentinel } = layout25TestConfig
  const connection = await openDatabase()
  try {
    await connection.execute( "DELETE FROM QualifyingImports WHERE layoutId = ?", [ "layout25" ] )
    await connection.execute( `DELETE FROM QualifyingTimes WHERE year = ? AND course = ? AND scope = ? AND area = ? AND type = ?`, [
      values.year, values.course, values.scope, values.area, values.type,
    ] )
    await connection.execute( `
      INSERT INTO QualifyingPeriods (year, scope, area, type, qualifyingStart, qualifyingEnd, lastRaceDate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE qualifyingStart = VALUES(qualifyingStart), qualifyingEnd = VALUES(qualifyingEnd), lastRaceDate = VALUES(lastRaceDate)
    `, [
      values.year, values.scope, values.area, values.type,
      sentinel.qualifyingStart, sentinel.qualifyingEnd, sentinel.lastRaceDate,
    ] )
    for ( const sample of samples ) {
      await connection.execute( `
        INSERT INTO QualifyingTimes (
          created, year, course, stroke, distance, scope, area, type, gender, age, timeString, time
        ) VALUES (CURRENT_DATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        values.year, values.course, sample.databaseStroke, sample.distance, values.scope, values.area,
        values.type, sample.gender, sample.age, sentinel.timeString, sentinel.time,
      ] )
    }
  } finally {
    await connection.end()
  }
}

const readStoredState = async () => {
  const { import: values } = layout25TestConfig
  const connection = await openDatabase()
  try {
    const [ times ] = await connection.execute<RowDataPacket[]>( `
      SELECT gender, stroke, distance, age, timeString, time
      FROM QualifyingTimes
      WHERE year = ? AND course = ? AND scope = ? AND area = ? AND type = ?
      ORDER BY gender, stroke, distance, age
    `, [ values.year, values.course, values.scope, values.area, values.type ] )
    const [ periods ] = await connection.execute<RowDataPacket[]>( `
      SELECT DATE_FORMAT(qualifyingStart, '%Y-%m-%d') AS qualifyingStart,
             DATE_FORMAT(qualifyingEnd, '%Y-%m-%d') AS qualifyingEnd,
             DATE_FORMAT(lastRaceDate, '%Y-%m-%d') AS lastRaceDate
      FROM QualifyingPeriods
      WHERE year = ? AND scope = ? AND area = ? AND type = ?
    `, [ values.year, values.scope, values.area, values.type ] )
    return { times, period: periods[0] }
  } finally {
    await connection.end()
  }
}

test.beforeEach( seedDifferentValues )

test( "detects and imports the real South West PDF with audited times and dates", async ( { request } ) => {
  const { admin, import: values, samples, sentinel } = layout25TestConfig
  const before = await readStoredState()
  expect( before.times ).toHaveLength( samples.length )
  expect( before.times.every( row => row.timeString === sentinel.timeString ) ).toBe( true )
  expect( before.period ).toMatchObject( {
    qualifyingStart: sentinel.qualifyingStart,
    qualifyingEnd: sentinel.qualifyingEnd,
    lastRaceDate: sentinel.lastRaceDate,
  } )

  const loginResponse = await request.post( "/api/user/login", {
    headers: { Origin: "http://127.0.0.1:3319" },
    multipart: { username: admin.username, password: admin.password },
  } )
  expect( loginResponse.status(), await loginResponse.text() ).toBe( 204 )

  const pdfBuffer = readFileSync( requireLayout25PdfPath() )
  const detectionResponse = await request.post( "/api/import/detect", {
    headers: { Origin: "http://127.0.0.1:3319" },
    multipart: {
      import_file: { name: "South West QT.pdf", mimeType: "application/pdf", buffer: pdfBuffer },
    },
  } )
  expect( detectionResponse.status(), await detectionResponse.text() ).toBe( 200 )
  expect( await detectionResponse.json() ).toMatchObject( {
    suggestedLayoutId: "layout25",
    confidence: "high",
    detectedYear: values.year,
    dates: {
      qualifyingStart: values.qualifyingStart,
      qualifyingEnd: values.qualifyingEnd,
      lastRaceDate: null,
    },
  } )

  const parseResponse = await request.post( "/api/import", {
    headers: { Origin: "http://127.0.0.1:3319" },
    multipart: {
      layout: "layout25",
      pdf_file: { name: "South West QT.pdf", mimeType: "application/pdf", buffer: pdfBuffer },
    },
  } )
  expect( parseResponse.status(), await parseResponse.text() ).toBe( 200 )
  const parsed = await parseResponse.json() as { structured: ParsedRow[] }
  expect( parsed.structured ).toHaveLength( 180 )

  const rowsToSave = samples.map( sample => {
    const parsedRow = parsed.structured.find( row => row.gender === sample.gender && row.event === sample.event && row.age === sample.age )
    expect( parsedRow ).toMatchObject( {
      course: values.course,
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
    data: {
      metadata: {
        filename: "South West QT.pdf",
        layoutId: "layout25",
        layoutName: "South West Winter Regional 2026",
        year: values.year,
        scope: values.scope,
        area: values.area,
        type: values.type,
        course: values.course,
      },
      period: {
        year: values.year,
        scope: values.scope,
        area: values.area,
        type: values.type,
        qualifyingStart: values.qualifyingStart,
        qualifyingEnd: values.qualifyingEnd,
        lastRaceDate: values.lastRaceDate,
      },
      rows: rowsToSave,
    },
  } )
  expect( saveResponse.status(), await saveResponse.text() ).toBe( 200 )
  const saved = await saveResponse.json() as { audited: boolean, importId: number, totalCount: number }
  expect( saved ).toMatchObject( { audited: true, totalCount: samples.length } )

  const after = await readStoredState()
  const storedByKey = new Map( after.times.map( row => [ `${row.gender}:${row.stroke}:${row.distance}:${row.age}`, row ] ) )
  for ( const sample of samples ) {
    const stored = storedByKey.get( `${sample.gender}:${sample.databaseStroke}:${sample.distance}:${sample.age}` )
    expect( stored?.timeString ).toBe( sample.timeString )
    expect( Number( stored?.time ) ).toBe( sample.time )
  }
  expect( after.period ).toMatchObject( {
    qualifyingStart: values.qualifyingStart,
    qualifyingEnd: values.qualifyingEnd,
    lastRaceDate: null,
  } )

  const connection = await openDatabase()
  try {
    const [ imports ] = await connection.execute<RowDataPacket[]>( `
      SELECT filename, layoutId, year, scope, area, type, course, totalCount, status
      FROM QualifyingImports WHERE id = ?
    `, [ saved.importId ] )
    expect( imports[0] ).toMatchObject( {
      filename: "South West QT.pdf",
      layoutId: "layout25",
      year: values.year,
      scope: values.scope,
      area: values.area,
      type: values.type,
      course: values.course,
      totalCount: samples.length,
      status: "completed",
    } )
  } finally {
    await connection.end()
  }
} )
