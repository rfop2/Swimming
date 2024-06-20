#!/usr/bin/env nodemjs
import "dotenv/config"
import { promises as fs } from "fs"
import fetch, { FetchError } from "node-fetch"
import { format, differenceInHours } from "date-fns"
import cheerio, { Cheerio, CheerioAPI, AnyNode } from "cheerio"
import seedrandom from "seedrandom"

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

interface PageInfo {
  url: URL,
  parser: ( arg1: CheerioAPI ) => unknown,
}

type PageData = Record<string,PageInfo>

const extractTableData = ( $: CheerioAPI, table: Cheerio<AnyNode> ) => {
  // const data = await page.evaluate( ( tbody: HTMLTableSectionElement ) => {
  const headers: Array<string> = []
  const dataObject: Array<Record<string,string>> = []

  let lastRowHeader = ""
  table.find( "tr" ).each( ( rowIndex, rowElement ) => {
    const row = $( rowElement )
    if ( rowIndex === 0 ) {
      row.find( "th" ).each( ( cellIndex, cellElement ) => {
        headers.push( $( cellElement ).text().toLowerCase().replace( /\s+/g, "_" ) )
      } )
      return
    }

    const valueCells = row.find( "td" )
    const rowData: Record<string,string> = {}
    let headerIndex = 0
    for ( const valueCell of valueCells ) {
      let value = $( valueCell ).text().trim()
      if ( headerIndex === 0 ) {
        if ( value === "" ) {
          value = lastRowHeader
        } else {
          lastRowHeader = value
        }
      }
      rowData[headers[headerIndex++]] = value
    }
    dataObject.push( rowData )
  } )
  return dataObject
}

const parseIndividual = ( $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: Record<string,unknown> = {}
  data.long_course = extractTableData( $, $( tables[0] ) )
  data.short_course = extractTableData( $, $( tables[1] ) )
  return data
}

interface Ranking {
  table?: Array<Record<string,string>>
  stats?: {
    position: number
    rank: number
    best: number
    time: number
    difference: number
  }
}

const parseRanking = ( $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: Ranking = {}
  data.table = extractTableData( $, $( tables[0] ) )
  if ( data.table.length ) {
    const index = data.table.findIndex( row => row.name === "Eloise Howard" )
    if ( index >= 0 ) {
      const rank = Number( data.table[index].rank )
      const bestTime = Number( data.table[0].time )
      const refTime = Number( data.table[index].time )
      const deltaTime = refTime - bestTime
      data.stats = {
        position: index+1,
        rank,
        best: bestTime,
        time: refTime,
        difference: deltaTime
      }
    }
  }
  return data
}

const individualBaseUrl = "/individualbest/personal_best.php"

const individualParams = {
  back: "individualbestname",
  mode: "L",
  name: "Howard",
  tiref: "1660835",
}

const rankBaseUrl = "/12months/last12.php"

const globalRankParams = {
  Sex: "F",
  AgeGroup: "11",
  date: "31/12/2024",
  StartNumber: "1",
  RecordsToView: "100",
  TargetNationality: "E",
}

const POOLS = {
  SHORT: "S",
  LONG: "L",
}

const STROKE = {
  FREESTYLE_50M: "1",
  FREESTYLE_100M: "2",
  FREESTYLE_200M: "3",
  FREESTYLE_400M: "4",
  FREESTYLE_800M: "5",
  FREESTYLE_1500M: "6",
  BACKSTROKE_50M: "13",
  BACKSTROKE_100M: "14",
  BACKSTROKE_200M: "15",
  BREASTSTROKE_50M: "7",
  BREASTSTROKE_100M: "8",
  BREASTSTROKE_200M: "9",
  BUTTERFLY_50M: "10",
  BUTTERFLY_100M: "11",
  BUTTERFLY_200M: "12",
  INDIVIDUAL_MEDLEY_100M: "18",
  INDIVIDUAL_MEDLEY_150M: "19",
  INDIVIDUAL_MEDLEY_200M: "16",
  INDIVIDUAL_MEDLEY_400M: "17",
}

const freestyle50mShortParams = {
  Pool: POOLS.SHORT,
  Stroke: STROKE.FREESTYLE_50M,
}

const butterfly50mShortParams = {
  Pool: POOLS.SHORT,
  Stroke: STROKE.BUTTERFLY_50M,
}

const nationalRankParams = {
  TargetRegion: "P",
  Level: "N",
  TargetCounty: "XXXX",
  TargetClub: "XXXX",
}

const regionalRankParams = {
  TargetRegion: "W",
  Level: "D",
  TargetCounty: "XXXX",
  TargetClub: "XXXX",
}

const countyRankParams = {
  TargetRegion: "P",
  Level: "C",
  TargetCounty: "GLUW",
  TargetClub: "XXXX",
}

const createUrl = ( base: string, params: Record<string,string> ) => {
  const url = new URL( BASE_URL + base )
  url.search = new URLSearchParams( params ).toString()
  return url
}

const pages: PageData = {
  "individual": {
    url: createUrl( individualBaseUrl, individualParams ),
    parser: parseIndividual,
  },
  "50m_butterfly_female_sc_11": {
    url: createUrl( rankBaseUrl, { ...butterfly50mShortParams,  ...globalRankParams, ...nationalRankParams } ),
    parser: parseRanking,
  },
  "50m_butterfly_female_sc_11_sw": {
    url: createUrl( rankBaseUrl, { ...butterfly50mShortParams, ...globalRankParams, ...regionalRankParams } ),
    parser: parseRanking,
  },
  "50m_butterfly_female_sc_11_glos": {
    url: createUrl( rankBaseUrl, { ...butterfly50mShortParams, ...globalRankParams, ...countyRankParams } ),
    parser: parseRanking,
  },
  "50m_freestyle_female_sc_11": {
    url: createUrl( rankBaseUrl, { ...freestyle50mShortParams,  ...globalRankParams, ...nationalRankParams } ),
    parser: parseRanking,
  },
  "50m_freestyle_female_sc_11_sw": {
    url: createUrl( rankBaseUrl, { ...freestyle50mShortParams, ...globalRankParams, ...regionalRankParams } ),
    parser: parseRanking,
  },
  "50m_freestyle_female_sc_11_glos": {
    url: createUrl( rankBaseUrl, { ...freestyle50mShortParams, ...globalRankParams, ...countyRankParams } ),
    parser: parseRanking,
  },
}

console.log( pages )
const fetchPage = async ( label: string, url: URL ) => {
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
    } else {
      console.error( "Unknown error:", error );
    }
  }
  try {
    console.log( `Fetching ${url}` )
    const response = await fetch( url )
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
  const data: Record<string,unknown> = {}
  for ( const [ label, pageInfo ] of Object.entries( pages ) ) {
    const content = await fetchPage( label, pageInfo.url )
    if ( content ) {
      const $ = cheerio.load( content )
      data[label] = await pageInfo.parser( $ )
    }
    sleep( rng() * 10.0 )
  }
  return data
}

const updateData = async () => {
  try {
    const data = await fetchPages()
    console.log( data )
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
