#!/usr/bin/env nodemjs
import puppeteer from "puppeteer"
// import puppeteerCore from 'puppeteer'
import { addExtra } from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { ElementHandle, Page } from "puppeteer"
import { format } from "date-fns"
import "dotenv/config"
// import * as fs from "node:fs/promises"
import { promises as fs } from "fs"
import fetch, { FetchError } from "node-fetch"
import { differenceInHours } from "date-fns"
import seedrandom from "seedrandom"

// Crashes might be due to running headless when X11 is present
// delete process.env.DISPLAY

const debugEnabled = !!( process.env?.DEBUG === "true" ) || false;

const rng = seedrandom( "12345" ) // For predictable randomness

const sleep = ( timeout: number ) => new Promise( r => setTimeout( r, timeout ) );

const debug = ( ...args: unknown[] ) => {
  if ( debugEnabled ) {
    console.log( ...args )
  }
}

const now = new Date()

const CACHE_DIR = "./cache"
const BASE_URL = "https://www.swimmingresults.org/"

const pages = {
  "individual": "/individualbest/personal_best.php?back=individualbestname&mode=L&name=Howard&tiref=1660835"
}

const fetchPage = async ( label: string, url: URL ) => {
  const contentFile = CACHE_DIR + "/" + label
  const stats = await fs.stat( contentFile )
  if ( stats ) {
    // Page has been cached
    const age = differenceInHours( now, stats.mtime )
    if ( age < 12 ) {
      // Page is new enough
      const content = await fs.readFile( label )
      return content
    }
  }
  try {
    const response = await fetch( url )
    const content = await response.text()
    await fs.writeFile( contentFile, content )
  } catch( error ) {
    if ( error instanceof FetchError ) {
      console.error( `Failed to fetch ${url}: ${error.message}` )
    }
  }
}

const fetchPages = async () => {
  for ( const [ label, url ] of Object.entries( pages ) ) {
    const content = await fetchPage( label, new URL( url ) )
  }
}

const validateActions = async() => {
  debug( `Checking user journeys at ${format( new Date(), "P p" )}` )

  if ( !process.env.USER_EMAIL || !process.env.USER_PASSWORD ) {
    console.error( "No user credentials found" )
    // process.exit( -1 )
  }

  // const baseUrl = process.env.SITE_ADDRESS as string
  // const loginUrl = `${baseUrl}/login.html`
  // const diagUrl = `${baseUrl}/index.html#admin_diag/m/4/s/2`
  // const resetUrl = `${baseUrl}/index.html#admin_devreboot/m/4/s/6`
  const screenPath = "debug"

  // debug( "Starting browser" )

  // add stealth plugin and use defaults (all evasion techniques)

  // const puppeteer = addExtra(puppeteerCore.default)

  /* const browser = await puppeteer
    // .use(StealthPlugin())
    .launch( {
      headless: true,
      defaultViewport: {
        width: 1400,
        height: 1920,
        // isLandscape: false,
      },
      ignoreHTTPSErrors: true,
      // slowMo: 250,
      dumpio: false,
    }
    )

  const page = await browser.newPage()

  page
    // .on('console', message =>
    //  console.log(`${message.type().substring(0, 3).toUpperCase()} ${message.text()}`))
    .on( "pageerror", ( { message } ) => console.log( message ) )
    // .on('response', response =>
    //  console.log(`${response.status()} ${response.url()}`))
    .on( "requestfailed", request =>
      console.log( `${request.failure()?.errorText} ${request.url()}` ) )

  if ( !process.env.SITE_ADDRESS ) {
    console.error( "No site address found" )
    process.exit( -1 )
  }
  const dumpPage = async ( page: Page, filename: string ) => {
    if ( debugEnabled )
      await page.screenshot( { path: `${screenPath}/${filename}.png`, fullPage: true } )
    // Capture and dump the content
    const html = await page.content();
    await fs.writeFile( `${screenPath}/${filename}.html`, html );
  } */

  const extractTableData = async ( table: ElementHandle<HTMLTableSectionElement> ) => {
    const data = await table.evaluate( ( tbody: HTMLTableSectionElement ) => {
      // const data = await page.evaluate( ( tbody: HTMLTableSectionElement ) => {
      const headers: Array<string> = []
      const dataObject: Record<string,Record<string,string>> = {}

      let index = 0;
      for ( const row of tbody.rows ) {
        if ( index++ === 0 ) {
          for ( const cell of row.cells ) {
            headers.push( cell.innerText.toLowerCase().replace( /\s+/g, "_" ) )
          }
          continue
        }

        const [ headerCell, ...valueCells ] = row.cells
        const rowHeader = headerCell.innerText.toLowerCase().replace( /\s+/g, "_" )
        dataObject[rowHeader] = {}
        let headerIndex = 1
        for ( const valueCell of valueCells ) {
          dataObject[rowHeader][headers[headerIndex++]] = valueCell.innerText
        }
      }
      return dataObject
    } )
    return data
  }

  try {
    // Go to the top-level page
    // await page.goto( baseUrl, { waitUntil: "networkidle2" } )
    const pageContent = await fs.readFile( "local.html", "utf8" );
    await page.setContent( pageContent )
    await dumpPage( page, "001-index" )

    const tables = await page.$$( "[id='rankTable'] tbody" )
    console.log( tables.length )
    const data: Record<string,unknown> = {}
    data.long_course = await extractTableData( tables[0] )
    data.short_course = await extractTableData( tables[1] )
    console.log( data )

    await dumpPage( page, "002-index" )

    // await login( page, process.env.USER_EMAIL, process.env.USER_PASSWORD )
    // await checkOrders( page )
    // await placeOrder( page, 18, 1, 2 )
    // await checkMessages( page )
    // await logout( page )

    /* try {
      if ( await testNetwork( page ) ) {
      } else {
        await reboot( page )
      }
    } catch (error) {
      console.error( "Test Error", error )
      await page.screenshot({ path: `${screenPath}/test-error.png`, fullPage: true })
      process.exit( -1 );
    } */

    debug( "Closing browser" )

    await browser.close()
  } catch ( error ) {
    await dumpPage( page, "000-error" )
    console.error( "General error", error )
    process.exit( -1 );
  }
}

( async () => {
  // const getopts = require( "getopts" )
  /* const options = getopts(process.argv.slice(2), {
    alias: {
      pages: ["p"],
      actions: "a",
    },
  }) */

  await validateActions()

  process.exit( 0 )
} )().catch( error => {
  console.error( "Caught error...", error );
  console.trace( error );
} );

process.on( "uncaughtException", function( err ) {
  console.log( "Possibly uncaught Exception: "+err );
  console.trace( err );
  process.exit( -1 );
} );

process.on( "unhandledRejection", function( reason, p ){
  console.log( "Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason );
  console.trace( reason );
  process.exit( -1 );
} );
