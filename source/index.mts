#!/usr/bin/env nodemjs
import "dotenv/config"
import { promises as fs } from "fs"
import fetch, { FetchError } from "node-fetch"
import { format, differenceInHours } from "date-fns"
import cheerio, { Cheerio, CheerioAPI, AnyNode } from "cheerio"
import Database from "better-sqlite3"
import seedrandom from "seedrandom"

const debugEnabled = !!( process.env?.DEBUG === "true" ) || false;

const MATCH_NAME = "Eloise Howard"

const rng = seedrandom( "12345" ) // For predictable randomness
const sleep = ( timeout: number ) => new Promise( r => setTimeout( r, timeout ) );

const debug = ( ...args: unknown[] ) => {
  if ( debugEnabled ) {
    console.log( ...args )
  }
}

const now = new Date()
const today = format( now, "yyyy-MM-dd" )

// Create a local database to persist state
const db = new Database( "database/records.db" )
db.pragma( "journal_mode = WAL" );

const CACHE_DIR = "./cache"
const BASE_URL = "https://www.swimmingresults.org/"

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

type IndividualStats = Array<Record<string,string>>

const parseIndividual = ( $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: IndividualStats = []
  const longCourse = extractTableData( $, $( tables[0] ) )
  data.push( ...longCourse.map( row => ( { ...{ course: "long"}, ...row } ) ) )
  const shortCourse = extractTableData( $, $( tables[1] ) )
  data.push( ...shortCourse.map( row => ( { ...{ course: "short"}, ...row } ) ) )

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

const timetoSeconds = ( time: string ): number => {
  // Split the input time string by colons
  const timeParts = time.split( ":" );

  // Initialize total seconds
  let totalSeconds = 0;

  if ( timeParts.length === 3 ) {
    // If format is hours:minutes:seconds.decimal
    const hours = parseFloat( timeParts[0] );
    const minutes = parseFloat( timeParts[1] );
    const seconds = parseFloat( timeParts[2] );

    // Convert to total seconds
    totalSeconds = hours * 3600 + minutes * 60 + seconds;
  } else if ( timeParts.length === 2 ) {
    // If format is minutes:seconds.decimal
    const minutes = parseFloat( timeParts[0] );
    const seconds = parseFloat( timeParts[1] );

    // Convert to total seconds
    totalSeconds = minutes * 60 + seconds;
  } else if ( timeParts.length === 1 ) {
    // If only one part, it's already in seconds
    totalSeconds = parseFloat( timeParts[0] );
  } else {
    throw new Error( "Invalid time format" );
  }

  return totalSeconds;
}

const parseRanking = ( $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: Ranking = {}
  data.table = extractTableData( $, $( tables[0] ) )
  if ( data.table.length ) {
    const index = data.table.findIndex( row => row.name === MATCH_NAME )
    if ( index >= 0 ) {
      const rank = Number( data.table[index].rank )
      const bestTime = timetoSeconds( data.table[0].time )
      const refTime = timetoSeconds( data.table[index].time )
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

const breaststroke100mShortParams = {
  Pool: POOLS.SHORT,
  Stroke: STROKE.BREASTSTROKE_100M,
}

const butterfly50mShortParams = {
  Pool: POOLS.SHORT,
  Stroke: STROKE.BUTTERFLY_50M,
}

const backstroke100mShortParams = {
  Pool: POOLS.SHORT,
  Stroke: STROKE.BACKSTROKE_100M,
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

interface PageInfo {
  label: string
  url: URL
  parser: ( arg1: CheerioAPI ) => IndividualStats | Ranking
}

type PageData = Array<PageInfo>

const pages: PageData = [
  {
    label: "individual",
    url: createUrl( individualBaseUrl, individualParams ),
    parser: parseIndividual,
  },
  {
    label: "50m_freestyle_female_sc_11",
    url: createUrl( rankBaseUrl, { ...freestyle50mShortParams,  ...globalRankParams, ...nationalRankParams } ),
    parser: parseRanking,
  },
  {
    label: "50m_freestyle_female_sc_11_sw",
    url: createUrl( rankBaseUrl, { ...freestyle50mShortParams, ...globalRankParams, ...regionalRankParams } ),
    parser: parseRanking,
  },
  {
    label: "50m_freestyle_female_sc_11_glos",
    url: createUrl( rankBaseUrl, { ...freestyle50mShortParams, ...globalRankParams, ...countyRankParams } ),
    parser: parseRanking,
  },
  {
    label: "100m_breaststroke_female_sc_11",
    url: createUrl( rankBaseUrl, { ...breaststroke100mShortParams,  ...globalRankParams, ...nationalRankParams } ),
    parser: parseRanking,
  },
  {
    label: "100m_breaststroke_female_sc_11_sw",
    url: createUrl( rankBaseUrl, { ...breaststroke100mShortParams, ...globalRankParams, ...regionalRankParams } ),
    parser: parseRanking,
  },
  {
    label: "100m_breaststroke_female_sc_11_glos",
    url: createUrl( rankBaseUrl, { ...breaststroke100mShortParams, ...globalRankParams, ...countyRankParams } ),
    parser: parseRanking,
  },
  {
    label: "50m_butterfly_female_sc_11",
    url: createUrl( rankBaseUrl, { ...butterfly50mShortParams,  ...globalRankParams, ...nationalRankParams } ),
    parser: parseRanking,
  },
  {
    label: "50m_butterfly_female_sc_11_sw",
    url: createUrl( rankBaseUrl, { ...butterfly50mShortParams, ...globalRankParams, ...regionalRankParams } ),
    parser: parseRanking,
  },
  {
    label: "50m_butterfly_female_sc_11_glos",
    url: createUrl( rankBaseUrl, { ...butterfly50mShortParams, ...globalRankParams, ...countyRankParams } ),
    parser: parseRanking,
  },
  {
    label: "100m_backstroke_female_sc_11",
    url: createUrl( rankBaseUrl, { ...backstroke100mShortParams,  ...globalRankParams, ...nationalRankParams } ),
    parser: parseRanking,
  },
  {
    label: "100m_backstroke_female_sc_11_sw",
    url: createUrl( rankBaseUrl, { ...backstroke100mShortParams, ...globalRankParams, ...regionalRankParams } ),
    parser: parseRanking,
  },
  {
    label: "100m_backstroke_female_sc_11_glos",
    url: createUrl( rankBaseUrl, { ...backstroke100mShortParams, ...globalRankParams, ...countyRankParams } ),
    parser: parseRanking,
  },
]

const fetchPage = async ( pageInfo: PageInfo ) => {
  const contentFile = CACHE_DIR + "/" + pageInfo.label
  console.log( `Processing ${pageInfo.label} -> ${pageInfo.url}` )
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
    console.log( `Fetching ${pageInfo.url}` )
    const response = await fetch( pageInfo.url )
    const content = await response.text()
    await fs.writeFile( contentFile, content )
    return content
  } catch( error ) {
    if ( error instanceof FetchError ) {
      console.error( `Failed to fetch ${pageInfo.url}: ${error.message}` )
    }
  }
}

const fetchPages = async () => {
  const data: Record<string,IndividualStats|Ranking> = {}
  for ( const pageInfo of pages ) {
    const content = await fetchPage( pageInfo )
    if ( content ) {
      const $ = cheerio.load( content )
      data[pageInfo.label] = pageInfo.parser( $ )
    }
    sleep( rng() * 10.0 )
  }
  return data
}

const updateData = async () => {
  try {
    const data = await fetchPages()
    console.log( data )
    for ( const [ label,dataset ] of Object.entries( data ) ) {
      if ( label === "individual" ) {
        const individualStats = dataset as IndividualStats
        const keys = Object.keys( individualStats[0] )
        const tableDef = `
CREATE TABLE IF NOT EXISTS Individual (
  created DATE DEFAULT CURRENT_TIMESTAMP,
  ${keys.map( key => ( `${key} TEXT` ) ).join( ",\n" )},
  UNIQUE(created, course, stroke)
)
`
        const tableCreate = db.prepare( tableDef )
        tableCreate.run()
        const saveDef = `
INSERT OR IGNORE INTO Individual
  ( created, ${keys.join( ", " )} )
  VALUES ( ?, ${Array( keys.length ).fill( "?" ).join( ", " )} )
`

        const saveData = db.prepare( saveDef )
        for ( const row of individualStats ) {
          saveData.run( [ today, ...Object.values( row ) ] )
        }
      } else {
        const ranking = dataset as Ranking
        const keys = Object.keys( ( ranking.table??[] )[0] )
        const tableDef = `
CREATE TABLE IF NOT EXISTS Rankings (
  created DATE DEFAULT CURRENT_TIMESTAMP,
  label TEXT,
  ${keys.map( key => ( `${key} TEXT` ) ).join( ",\n" )}
)
`
        const tableCreate = db.prepare( tableDef )
        tableCreate.run()

        const deleteDef = "DELETE FROM Rankings WHERE created = ? AND label = ?"
        const deleteRankings = db.prepare( deleteDef )
        deleteRankings.run( today, label )

        const saveDef = `INSERT INTO Rankings ( created, label, ${keys.join( ", " )} ) VALUES ( ?, ?, ${Array( keys.length ).fill( "?" ).join( ", " )} )`
        const saveRankings = db.prepare( saveDef )
        for ( const row of ranking.table??[] ) {
          saveRankings.run( [ today, label, ...Object.values( row ) ] )
        }

        if ( ranking.stats ) {
          const keys = Object.keys( ranking.stats )
          const tableDef = `
CREATE TABLE IF NOT EXISTS Performance (
  created DATE DEFAULT CURRENT_TIMESTAMP,
  label TEXT,
  ${keys.map( key => ( `${key} TEXT` ) ).join( ",\n" )},
  UNIQUE( created, label )
)
`
          const tableCreate = db.prepare( tableDef )
          tableCreate.run()

          const deleteDef = "DELETE FROM Performance WHERE created = ? AND label = ?"
          const deleteRankings = db.prepare( deleteDef )
          deleteRankings.run( today, label )

          const saveDef = `INSERT INTO Performance ( created, label, ${keys.join( ", " )} ) VALUES ( ?, ?, ${Array( keys.length ).fill( "?" ).join( ", " )} )`

          const saveStats = db.prepare( saveDef )
          saveStats.run( [ today, label, ...Object.values( ranking.stats ) ] )
        }
      }
    }
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
