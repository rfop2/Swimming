import { createConnection, type RowDataPacket } from "mysql2/promise"
import { expect, test, type Page } from "@playwright/test"
import { requireLayout7PdfPath } from "../swimming-import/layout7Fixture"
import { layout7TestConfig } from "../support/layout7TestConfig"

const selectListboxOption = async ( page: Page, label: string, option: string ) => {
  const listbox = page.getByText( label, { exact: true } ).locator( ".." )
  await listbox.getByRole( "button" ).click()
  await page.getByRole( "option", { name: option, exact: true } ).click()
}

const readSeededValues = async () => {
  const { database, import: importValues, expected } = layout7TestConfig
  const connection = await createConnection( {
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.name,
  } )

  try {
    const [ times ] = await connection.execute<RowDataPacket[]>( `
      SELECT timeString, time FROM QualifyingTimes
      WHERE year = ? AND course = ? AND stroke = ? AND distance = ?
        AND scope = ? AND area = ? AND type = ? AND gender = ? AND age = ?
    `, [
      importValues.year,
      importValues.course,
      expected.stroke,
      expected.distance,
      importValues.scope,
      importValues.area,
      importValues.type,
      expected.gender,
      expected.age,
    ] )
    const [ periods ] = await connection.execute<RowDataPacket[]>( `
      SELECT
        DATE_FORMAT(qualifyingStart, '%Y-%m-%d') AS qualifyingStart,
        DATE_FORMAT(qualifyingEnd, '%Y-%m-%d') AS qualifyingEnd,
        DATE_FORMAT(lastRaceDate, '%Y-%m-%d') AS lastRaceDate
      FROM QualifyingPeriods
      WHERE year = ? AND scope = ? AND area = ? AND type = ?
    `, [ importValues.year, importValues.scope, importValues.area, importValues.type ] )
    const [ counts ] = await connection.execute<RowDataPacket[]>( `
      SELECT COUNT(*) AS rowCount FROM QualifyingTimes
      WHERE year = ? AND course = ? AND scope = ? AND area = ? AND type = ?
    `, [
      importValues.year,
      importValues.course,
      importValues.scope,
      importValues.area,
      importValues.type,
    ] )
    return { time: times[0], period: periods[0], rowCount: Number( counts[0].rowCount ) }
  } finally {
    await connection.end()
  }
}

test( "imports the real Berkshire PDF through the UI and overwrites test sentinels", async ( { page } ) => {
  const { admin, import: importValues, sentinel, expected } = layout7TestConfig

  const before = await readSeededValues()
  expect( before.time.timeString ).toBe( sentinel.timeString )
  expect( before.period ).toMatchObject( {
    qualifyingStart: sentinel.qualifyingStart,
    qualifyingEnd: sentinel.qualifyingEnd,
    lastRaceDate: sentinel.lastRaceDate,
  } )
  expect( sentinel.timeString ).not.toBe( expected.timeString )
  expect( sentinel.qualifyingStart ).not.toBe( importValues.qualifyingStart )

  const loginResponse = await page.request.post( "/api/user/login", {
    headers: { Origin: "http://127.0.0.1:3317" },
    multipart: {
      username: admin.username,
      password: admin.password,
    },
  } )
  expect( loginResponse.status(), await loginResponse.text() ).toBe( 204 )

  await page.goto( "/qualifying/import" )
  await page.waitForLoadState( "networkidle" )
  const pdfPath = requireLayout7PdfPath()
  const fileInput = page.locator( 'input[type="file"]' )
  await expect( async () => {
    await fileInput.setInputFiles( pdfPath )
    await expect( page.getByText( /Layout detected: Berkshire & South Bucks/ ) ).toBeVisible()
  } ).toPass( { timeout: 30_000 } )
  await page.getByRole( "button", { name: "Use suggested layout" } ).click()
  await expect( page.getByRole( "heading", { name: "Layout 7 — Berkshire & South Bucks" } ) ).toBeVisible()

  await selectListboxOption( page, "Year", String( importValues.year ) )
  await selectListboxOption( page, "Area", "Berkshire & South Bucks" )
  await selectListboxOption( page, "Course", "Short" )
  await page.getByLabel( /^Qualifying Start Date/ ).fill( importValues.qualifyingStart )
  await page.getByLabel( "Qualifying End Date" ).fill( importValues.qualifyingEnd )
  await page.getByLabel( "Last Race Date" ).fill( importValues.lastRaceDate )

  await page.getByRole( "button", { name: "Parse & review", exact: true } ).click()
  await page.waitForURL( url => url.pathname === "/parsed" )
  await expect( page.getByRole( "heading", { name: /Parsed Results/ } ) ).toBeVisible()
  await expect( page.getByText( "Freestyle 50m", { exact: true } ).first() ).toBeVisible()

  await page.getByRole( "button", { name: "Save to Database" } ).click()
  await expect( page.getByRole( "heading", { name: "Import complete" } ) ).toBeVisible()

  const after = await readSeededValues()
  expect( after.time.timeString ).toBe( expected.timeString )
  expect( Number( after.time.time ) ).toBe( expected.time )
  expect( after.rowCount ).toBe( 272 )
  expect( after.period ).toMatchObject( {
    qualifyingStart: importValues.qualifyingStart,
    qualifyingEnd: importValues.qualifyingEnd,
    lastRaceDate: importValues.lastRaceDate,
  } )
} )
