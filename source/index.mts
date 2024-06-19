#!/usr/bin/env nodemjs
import "dotenv/config"
import { promises as fs } from "fs"
import fetch, { FetchError } from "node-fetch"
import { format, differenceInHours } from "date-fns"
import cheerio, { Cheerio, CheerioAPI, AnyNode } from "cheerio"
// import seedrandom from "seedrandom"

const debugEnabled = !!( process.env?.DEBUG === "true" ) || false;

// const rng = seedrandom( "12345" ) // For predictable randomness
// const sleep = ( timeout: number ) => new Promise( r => setTimeout( r, timeout ) );

const debug = ( ...args: unknown[] ) => {
  if ( debugEnabled ) {
    console.log( ...args )
  }
}

const now = new Date()

const CACHE_DIR = "./cache"
const BASE_URL = "https://www.swimmingresults.org/"

interface PageInfo {
  url: string,
  parser: ( arg1: CheerioAPI ) => unknown,
}

type PageData = Record<string,PageInfo>

const extractTableData = ( $: CheerioAPI, table: Cheerio<AnyNode> ) => {
  // const data = await page.evaluate( ( tbody: HTMLTableSectionElement ) => {
  const headers: Array<string> = []
  const dataObject: Record<string,Record<string,string>> = {}

  table.find( "tr" ).each( ( rowIndex, rowElement ) => {
    const row = $( rowElement )
    if ( rowIndex === 0 ) {
      row.find( "th" ).each( ( cellIndex, cellElement ) => {
        headers.push( $( cellElement ).text().toLowerCase().replace( /\s+/g, "_" ) )
      } )
      return
    }

    const [ headerCell, ...valueCells ] = row.find( "td" )
    const rowHeader = $( headerCell ).text().toLowerCase().replace( /\s+/g, "_" )
    dataObject[rowHeader] = {}
    let headerIndex = 1
    for ( const valueCell of valueCells ) {
      dataObject[rowHeader][headers[headerIndex++]] = $( valueCell ).text()
    }
  } )
  return dataObject
}

const parseIndividual = ( $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  console.log( tables.length )
  const data: Record<string,unknown> = {}
  data.long_course = extractTableData( $, $( tables[0] ) )
  data.short_course = extractTableData( $, $( tables[1] ) )
  console.log( data )
}

const pages: PageData = {
  "individual": {
    url: "/individualbest/personal_best.php?back=individualbestname&mode=L&name=Howard&tiref=1660835",
    parser: parseIndividual,
  }
}

const fetchPage = async ( label: string, url: string ) => {
  const contentFile = CACHE_DIR + "/" + label
  console.log( `Processing ${label} -> ${url}` )
  try {
    const stats = await fs.stat( contentFile )
    // Page has been cached
    const age = differenceInHours( now, stats.mtime )
    console.log( `Cached: ${age}` )
    if ( age < 12 ) {
      // Page is new enough
      console.log( `Reading ${contentFile}` )
      const content = await fs.readFile( contentFile )
      return content
    }
  } catch( error ) {
    if ( error instanceof Error && ( error as NodeJS.ErrnoException ).code ) {
      const err = error as NodeJS.ErrnoException;
      if ( err.code !== "ENOENT" ) {
        console.error( `Error code: ${err.code} - ${err.message}` );
      }
    }
    console.error( "Unknown error:", error );
  }
  try {
    console.log( `Fetching ${url}` )
    const response = await fetch( BASE_URL + "/" + url )
    const content = await response.text()
    await fs.writeFile( contentFile, content )
    return content
  } catch( error ) {
    if ( error instanceof FetchError ) {
      console.error( `Failed to fetch ${url}: ${error.message}` )
    }
  }
}

const fetchPages = async () => {
  for ( const [ label, pageInfo ] of Object.entries( pages ) ) {
    const content = await fetchPage( label, pageInfo.url )
    if ( content ) {
      const $ = cheerio.load( content )
      await pageInfo.parser( $ )
    }
  }
}

const updateData = async () => {
  try {
    await fetchPages()
  } catch ( error ) {
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

  await updateData()

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
