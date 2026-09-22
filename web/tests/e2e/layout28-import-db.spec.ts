import { readFileSync } from "node:fs"
import { createConnection, type RowDataPacket } from "mysql2/promise"
import { expect, test } from "@playwright/test"
import { requireLayout28PdfPath } from "../swimming-import/layout28Fixture"
import { layout28TestConfig } from "../support/layout28TestConfig"

type ParsedRow = { gender: string, course: string, event: string, distance: string, stroke: string, age: string, time: string | null }

const openDatabase = () => {
  const { database } = layout28TestConfig
  return createConnection( {
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.name,
  } )
}

test.beforeEach( async () => {
  const { import: values, samples, sentinel } = layout28TestConfig
  const connection = await openDatabase()
  try {
    await connection.execute( "DELETE FROM QualifyingImports WHERE layoutId = ?", [ "layout28" ] )
    await connection.execute( `
      DELETE FROM QualifyingTimes
      WHERE year = ? AND course = ? AND scope = ? AND area = ? AND type = ?
    `, [ values.year, values.course, values.scope, values.area, values.type ] )
    await connection.execute( `
      INSERT INTO QualifyingPeriods (year, scope, area, type, qualifyingStart, qualifyingEnd, lastRaceDate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE qualifyingStart = VALUES(qualifyingStart),
        qualifyingEnd = VALUES(qualifyingEnd), lastRaceDate = VALUES(lastRaceDate)
    `, [ values.year, values.scope, values.area, values.type, sentinel.qualifyingStart, sentinel.qualifyingEnd, sentinel.lastRaceDate ] )

    for ( const sample of samples ) {
      await connection.execute( `
        INSERT INTO QualifyingTimes (
          created, year, course, stroke, distance, scope, area, type, gender, age, timeString, time
        ) VALUES (CURRENT_DATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [ values.year, values.course, sample.databaseStroke, sample.distance, values.scope, values.area, values.type, sample.gender, sample.age, sentinel.timeString, sentinel.time ] )
    }
  } finally {
    await connection.end()
  }
} )

test( "detects and imports the Staffordshire PDF with audited times and dates", async ( { request } ) => {
  const { admin, import: values, samples } = layout28TestConfig
  const origin = "http://127.0.0.1:3321"
  const loginResponse = await request.post( "/api/user/login", {
    headers: { Origin: origin },
    multipart: { username: admin.username, password: admin.password },
  } )
  expect( loginResponse.status(), await loginResponse.text() ).toBe( 204 )

  const pdfFile = {
    name: "Staffordshire QT_2027_15Sep26.pdf",
    mimeType: "application/pdf",
    buffer: readFileSync( requireLayout28PdfPath() ),
  }
  const detectionResponse = await request.post( "/api/import/detect", {
    headers: { Origin: origin },
    multipart: { import_file: pdfFile },
  } )
  expect( detectionResponse.status(), await detectionResponse.text() ).toBe( 200 )
  expect( await detectionResponse.json() ).toMatchObject( {
    suggestedLayoutId: "layout28",
    confidence: "high",
    detectedYear: values.year,
    dates: {
      qualifyingStart: values.qualifyingStart,
      qualifyingEnd: values.qualifyingEnd,
      lastRaceDate: null,
    },
  } )

  const parseResponse = await request.post( "/api/import", {
    headers: { Origin: origin },
    multipart: { layout: "layout28", pdf_file: pdfFile },
  } )
  expect( parseResponse.status(), await parseResponse.text() ).toBe( 200 )
  const parsed = await parseResponse.json() as { structured: ParsedRow[] }
  expect( parsed.structured ).toHaveLength( 272 )

  const rows = samples.map( sample => {
    const parsedRow = parsed.structured.find( row => row.gender === sample.gender && row.event === sample.event && row.age === sample.age )
    expect( parsedRow ).toMatchObject( { course: values.course, time: sample.timeString } )
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
    headers: { Origin: origin },
    data: {
      metadata: {
        filename: pdfFile.name,
        layoutId: "layout28",
        layoutName: "Staffordshire County 2027",
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
      rows,
    },
  } )
  expect( saveResponse.status(), await saveResponse.text() ).toBe( 200 )
  const saved = await saveResponse.json() as { audited: boolean, importId: number, totalCount: number }
  expect( saved ).toMatchObject( { audited: true, totalCount: samples.length } )

  const connection = await openDatabase()
  try {
    const [ storedTimes ] = await connection.execute<RowDataPacket[]>( `
      SELECT gender, stroke, distance, age, timeString FROM QualifyingTimes
      WHERE year = ? AND course = ? AND scope = ? AND area = ? AND type = ?
    `, [ values.year, values.course, values.scope, values.area, values.type ] )
    expect( storedTimes ).toHaveLength( samples.length )
    for ( const sample of samples ) {
      expect( storedTimes ).toContainEqual( expect.objectContaining( {
        gender: sample.gender,
        stroke: sample.databaseStroke,
        distance: sample.distance,
        age: sample.age,
        timeString: sample.timeString,
      } ) )
    }

    const [ periods ] = await connection.execute<RowDataPacket[]>( `
      SELECT DATE_FORMAT(qualifyingStart, '%Y-%m-%d') AS qualifyingStart,
        DATE_FORMAT(qualifyingEnd, '%Y-%m-%d') AS qualifyingEnd, lastRaceDate
      FROM QualifyingPeriods WHERE year = ? AND scope = ? AND area = ? AND type = ?
    `, [ values.year, values.scope, values.area, values.type ] )
    expect( periods[0] ).toMatchObject( {
      qualifyingStart: values.qualifyingStart,
      qualifyingEnd: values.qualifyingEnd,
      lastRaceDate: null,
    } )

    const [ imports ] = await connection.execute<RowDataPacket[]>( `
      SELECT filename, layoutId, course, totalCount, status FROM QualifyingImports WHERE id = ?
    `, [ saved.importId ] )
    expect( imports[0] ).toMatchObject( {
      filename: pdfFile.name,
      layoutId: "layout28",
      course: values.course,
      totalCount: samples.length,
      status: "completed",
    } )
  } finally {
    await connection.end()
  }
} )
