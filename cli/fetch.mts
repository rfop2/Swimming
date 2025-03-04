#!/usr/bin/env nodemjs
import "dotenv/config"
import { format, parse, differenceInHours } from "date-fns"
import { stat, readFile, writeFile } from "fs/promises"
import type { AnyNode } from "domhandler"
import * as cheerio from "cheerio"
import type { Cheerio, CheerioAPI } from "cheerio"
import Database from "better-sqlite3"
// import { inspect } from "util"

import {
  CACHE_DIR,
  MAX_FETCH_INTERVAL,
  MIN_FETCH_INTERVAL,
  USER_AGENT,
  DB_PATH,
  // createSwimmerSql,
  // createIndividualSql,
  // createPerformanceSql,
  // createRankingsSql,
  // createResultsSql,
  deletePerformanceSql,
  insertIndividualSql,
  insertPerformanceSql,
  insertRankingsSql,
  insertResultsSql,
  shuffle,
  timeToSeconds,
  sleep,
  rng,
  extendedPages,
} from "lib"

import type {
  Individual,
  IndividualStats,
  PageInfo,
  Ranking,
  RankingRow,
  Result,
  Results,
  Swimmer
} from "lib"

const now = new Date()
const today = format( now, "yyyy-MM-dd" )

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

// Create tables, and prepare statements
// const swimmerTableCreate = db.prepare( createSwimmerSql )
// swimmerTableCreate.run()

const getSwimmers = db.prepare<unknown[],Swimmer>(
  "SELECT * FROM SwimmersView WHERE active = 1"
)

// const individualTableCreate = db.prepare( createIndividualSql )
// individualTableCreate.run()

const saveIndividual = db.prepare( insertIndividualSql )

// const rankingsTableCreate = db.prepare( createRankingsSql )
// rankingsTableCreate.run()

interface RankingRecord extends RankingRow {
  course: string
  stroke: string
  distance: string
  area: string
}

const getBestRankingTimes = db.prepare<{date:string,gender:string,age:string},RankingRecord>(
  "SELECT course, stroke, distance, area, date, MIN(time) as time FROM Rankings WHERE created = :date AND gender = :gender AND age = :age GROUP BY gender, age, course, stroke, distance, area"
)

const getSwimmerRankingTimes = db.prepare<{date:string,name:string},RankingRecord>(
  "SELECT course, stroke, distance, area, rank, date, time FROM Rankings WHERE created = :date AND name = :name"
)

export const deleteRankingsSql = "DELETE FROM Rankings WHERE created = :created AND gender = :gender AND age = :age"

const deleteRankings = db.prepare( deleteRankingsSql )

const saveRankings = db.prepare( insertRankingsSql )

// const performanceTableCreate = db.prepare( createPerformanceSql )
// performanceTableCreate.run()

const deletePerformance = db.prepare( deletePerformanceSql )

const savePerformance = db.prepare( insertPerformanceSql )

// const resultsTableCreate = db.prepare( createResultsSql )
// resultsTableCreate.run()

const saveResults = db.prepare( insertResultsSql )

const extractTableData = ( $: CheerioAPI, table: Cheerio<AnyNode> ) => {
  // const data = await page.evaluate( ( tbody: HTMLTableSectionElement ) => {
  const headers: Array<string> = []
  const dataObject: Array<Record<string, string>> = []

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
    const rowData: Record<string, string> = {}
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

const parseIndividual = ( pageInfo: PageInfo, $: CheerioAPI ) => {
  const headers = $( "p.rnk_sj" )
  const tables = $( "[id='rankTable'] tbody" )
  const data: IndividualStats = []
  tables.each( ( index, table ) => {
    const label = $( headers[index + 1] ).text().trim()
    let course = ""
    if ( label === "Long Course" ) {
      course = "lc"
    } else if ( label === "Short Course" ) {
      course = "sc"
    } else {
      throw new Error( `Unexpected table label '${label}` )
    }

    const tableData = extractTableData( $, $( table ) )
    for ( const row of tableData ) {
      const matches = row.stroke.match( /(?<distance>\d+)\s(?<stroke>[\w\s]+)$/ )
      if ( !matches ) {
        throw new Error( `Can't match individual on '${row.stroke}'` )
      }
      const { distance = "", stroke = "" } = { ...matches?.groups }

      const courseRow: Individual = {
        course,
        stroke: stroke.replace( /\s/g, "_" ).toLowerCase(),
        distance: `${distance}m`,
        time: timeToSeconds( course === "lc" ? row.lc_time : row.sc_time ),
        converted_time: timeToSeconds( course === "lc" ? row.converted_to_sc : row.converted_to_lc ),
        wa_pts: Number( course === "lc" ? row.lc_wa_pts : row.sc_wa_pts ),
        date: format( parse( row.date, "dd/MM/yy", now ), "yyyy-MM-dd" ),
        meet: row.meet,
        venue: row.venue,
        licence: row.licence,
        level: Number( row.level ),
      }
      data.push( courseRow )
    }
  } )

  return data
}

const parseRanking = ( pageInfo: PageInfo, $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: Ranking = {
    table: [],
  }
  const table = extractTableData( $, $( tables[0] ) )
  if ( table.length ) {
    // Do any conversions
    for ( const row of table ) {
      if ( row.name === "Member Hidden" ) {
        continue
      }
      const rankingRow: RankingRow = {
        rank: Number( row.rank ),
        name: row.name,
        ranked_club: row.ranked_club,
        yob: Number( row.yob ),
        meet_name: row.meet_name,
        venue: row.venue,
        level: Number( row.level ),
        date: format( parse( row.date, "dd/MM/yy", now ), "yyyy-MM-dd" ),
        time: timeToSeconds( row.time ),
        fina: Number( row.fina ),
      }
      data.table.push( rankingRow )
    }
  }
  return data
}

const parseResults = ( pageInfo: PageInfo, $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: Results = []
  const table = extractTableData( $, $( tables[1] ) )
  if ( table.length ) {
    // Do any conversions
    for ( const row of table ) {
      const resultRow: Result = {
        time: timeToSeconds( row.time ),
        wa_pts: Number( row.wa_pts ),
        round: row.round,
        date: format( parse( row.date, "dd/MM/yy", now ), "yyyy-MM-dd" ),
        meet: row.meet,
        venue: row.venue,
        club_swam_under: row.club_swam_under,
        level: Number( row.level ),
      }
      data.push( resultRow )
    }
  }
  return data
}

interface PageData {
  individual: IndividualStats
  ranking: Record<string,Ranking>
  results: Record<string,Results>
}

export const fetchPage = async ( pageInfo: PageInfo ) => {
  const contentFile = CACHE_DIR + "/" + pageInfo.label
  console.log( `Processing ${pageInfo.label} -> ${pageInfo.url}` )
  try {
    const stats = await stat( contentFile )
    // Page has been cached
    const age = differenceInHours( Date.now(), stats.mtime )
    console.log( `Cached: ${age}` )
    if ( age < 24 ) {
      // Page is new enough
      console.log( `Reading ${contentFile}` )
      const content = await readFile( contentFile )
      return content
    }
  } catch ( error ) {
    if ( error instanceof Error && ( error as NodeJS.ErrnoException ).code ) {
      const err = error as NodeJS.ErrnoException
      if ( err.code !== "ENOENT" ) {
        console.error( `Error code: ${err.code} - ${err.message}` )
      }
    } else {
      console.error( "Unknown error:", error )
    }
  }
  try {
    console.log( `Fetching ${pageInfo.url}` )
    const response = await fetch( pageInfo.url, {
      method: "GET",
      headers: new Headers( {
        "User-Agent": USER_AGENT,
      } )
    } )
    const content = await response.text()
    await writeFile( contentFile, content )
    const timeout = MIN_FETCH_INTERVAL + ( rng() * ( MAX_FETCH_INTERVAL - MIN_FETCH_INTERVAL ) )
    console.log( `Sleeping for ${timeout.toFixed( 2 )} seconds` )
    await sleep( timeout )
    return content
  } catch ( error ) {
    console.error( `Failed to fetch ${pageInfo.url}`, error )
    throw error
  }
}

const fetchPages = async ( swimmer: Swimmer ) => {
  const data: PageData = {
    individual: [],
    ranking: {},
    results: {}
  }
  const extPages = extendedPages( swimmer )
  for ( const pageInfo of shuffle( extPages ) ) {
    const content = await fetchPage( pageInfo )
    if ( content ) {
      const $ = cheerio.load( content )
      switch ( pageInfo.type ) {
        case "individual": {
          data[pageInfo.type] = parseIndividual( pageInfo, $ )
          break
        }
        case "ranking" : {
          data[pageInfo.type][pageInfo.label] = parseRanking( pageInfo, $ )
          break
        }
        case "results" : {
          data[pageInfo.type][pageInfo.label] = parseResults( pageInfo, $ )
          break
        }
        default : {
          throw new Error( `Not parser defined for page type ${pageInfo.type}` )
        }
      }
    }
  }
  return data
}

const updateData = async ( swimmer: Swimmer ) => {
  console.log( `Updating data for swimmer '${swimmer.name}'` )

  const pageData = await fetchPages( swimmer )
  // console.log( inspect( pageData, { depth: 5 } ) )

  // Individual
  for ( const row of pageData.individual ) {
    saveIndividual.run( { created: today, swimmer: swimmer.id, ...row } )
  }

  // Rankings + Performance
  deleteRankings.run( { created: today, gender: swimmer.gender, age: swimmer.age } )
  for ( const [ label, ranking ] of Object.entries( pageData.ranking ) ) {
    // 100m_backstroke_female_sc_11_glos
    const regexp = new RegExp( `(?<distance>\\d+m)_(?<stroke>\\w+)_${swimmer.gender}_(?<course>.c)_${swimmer.age}(?:_(?<area>\\w+))?(?:-(?<page>\\d+))?` )
    const matches = label.match( regexp )
    if ( !matches ) {
      throw new Error( `Can't match ranking on '${label}'` )
    }
    const { distance = "", stroke = "", course = "", area = "" } = { ...matches?.groups }
    // const area = groups.area ? ( groups.area === "glos" ? "county" : "regional" ) : "national"

    for ( const row of ranking.table ) {
      saveRankings.run( { created: today, gender: swimmer.gender, age: swimmer.age, swimmer: "", course, stroke, distance, area, ...row } )
    }
  }

  // Now generate the performance records
  const swimmerTimes = getSwimmerRankingTimes.all( { date: today, name: swimmer.name } )
  const bestTimes = getBestRankingTimes.all( { date: today, gender: swimmer.gender, age: swimmer.age } )
  const bestTimesMap = new Map( bestTimes.map( time => [ `${time.course}_${time.stroke}_${time.distance}_${time.area}`, time ] ) )

  for ( const swimmerTime of swimmerTimes ) {
    const raceLabel = `${swimmerTime.course}_${swimmerTime.stroke}_${swimmerTime.distance}_${swimmerTime.area}`
    const bestTime = bestTimesMap.get( raceLabel )
    if ( !bestTime ) {
      throw new Error( `Unable to find best time record for '${raceLabel}` )
    }
    const record = {
      position: 0,
      rank: swimmerTime.rank,
      best: bestTime.time,
      best_date: bestTime.date,
      time: swimmerTime.time,
      time_date: swimmerTime.date,
      difference: swimmerTime.time - bestTime.time,
    }
    deletePerformance.run( today, swimmer.id, swimmerTime.course, swimmerTime.stroke, swimmerTime.distance, swimmerTime.area )
    savePerformance.run( { created: today, swimmer: swimmer.id, course: swimmerTime.course, stroke: swimmerTime.stroke, distance: swimmerTime.distance, area: swimmerTime.area, ...record } )
  }

  // Results
  for ( const [ label, results ] of Object.entries( pageData.results ) ) {
    const regexp = new RegExp( `(?<distance>\\d+m)_(?<stroke>\\w+)_(?<course>.c)_${swimmer.id}$` )
    const matches = label.match( regexp )
    if ( !matches ) {
      throw new Error( `Can't match results on '${label}'` )
    }
    const { distance = "", stroke = "", course = "" } = { ...matches?.groups }

    for ( const result of results ) {
      saveResults.run( { created: today, swimmer: swimmer.id, course, stroke, distance, ...result } )
    }
  }
};

( async () => {
  // const getopts = require( "getopts" )
  /* const options = getopts(process.argv.slice(2), {
    alias: {
      pages: ["p"],
      actions: "a",
    },
  }) */

  try {
    const swimmers = getSwimmers.all()
    for ( const swimmer of swimmers ) {
      if ( process.argv.length < 3 || process.argv[2] === swimmer.id ) {
        await updateData( swimmer )
      }
    }
  } catch ( error ) {
    console.error( "General error", error )
    process.exit( -1 )
  }

  process.exit( 0 )
} )().catch( ( error ) => {
  console.error( "Caught error...", error )
  console.trace( error )
} )

process.on( "uncaughtException", function ( err ) {
  console.log( "Possibly uncaught Exception: " + err )
  console.trace( err )
  process.exit( -1 )
} )

process.on( "unhandledRejection", function ( reason, p ) {
  console.log(
    "Possibly Unhandled Rejection at: Promise ",
    p,
    " reason: ",
    reason,
  )
  console.trace( reason )
  process.exit( -1 )
} )
