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
  timeToSeconds,
  sleep,
  rng,
  createUrl,
  individualBaseUrl,
  individualParams,
  rankBaseUrl,
  globalRankParams,
  nationalRankParams,
  regionalRankParams,
  countyRankParams,
  resultsBaseUrl,
  resultsParams,
  STROKE_DISTANCE,
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

const updateIndividual = async ( swimmer: Swimmer ) => {
  console.log( `Updating individual data for swimmer '${swimmer.name}'` )

  const page: PageInfo = {
    label: `individual_${swimmer.id}`,
    url: createUrl( individualBaseUrl, individualParams( swimmer ) ),
    type: "individual"
  }
  const content = await fetchPage( page )
  // console.log( inspect( pageData, { depth: 5 } ) )
  const $ = cheerio.load( content )

  const individualData = parseIndividual( page, $ )

  console.log( `Got records for ${individualData.length} events` )
  for ( const row of individualData ) {
    saveIndividual.run( { created: today, swimmer: swimmer.id, ...row } )
  }

  return individualData
}

const updateResults = async ( swimmer: Swimmer, individualData: Array<Individual> ) => {
  console.log( `Updating results data for swimmer '${swimmer.name}'` )

  for ( const event of individualData ) {
    const stroke_distance = STROKE_DISTANCE[`${event.stroke}__${event.distance}`.toLocaleUpperCase() as keyof typeof STROKE_DISTANCE]
    const course = event.course.substring( 0, 1 ).toLocaleUpperCase()

    const page: PageInfo = {
      label: `${event.distance}_${event.stroke}_${event.course}_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: stroke_distance, tcourse: course },
      } ),
      type: "results"
    }

    const content = await fetchPage( page )
    // console.log( inspect( pageData, { depth: 5 } ) )
    const $ = cheerio.load( content )

    const resultsData = parseResults( page, $ )

    const regexp = new RegExp( `(?<distance>\\d+m)_(?<stroke>\\w+)_(?<course>.c)_${swimmer.id}$` )
    const matches = page.label.match( regexp )
    if ( !matches ) {
      throw new Error( `Can't match results on '${page.label}'` )
    }

    for ( const result of resultsData ) {
      saveResults.run( { created: today, swimmer: swimmer.id, course: event.course, stroke: event.stroke, distance: event.distance, ...result } )
    }
  }
}

const updateRankings = async ( swimmer: Swimmer, individualData: Array<Individual> ) => {
  console.log( `Updating ranking data for swimmer '${swimmer.name}'` )

  deleteRankings.run( { created: today, gender: swimmer.gender, age: swimmer.age } )
  for ( const event of individualData ) {
    const stroke_distance = STROKE_DISTANCE[`${event.stroke}__${event.distance}`.toLocaleUpperCase() as keyof typeof STROKE_DISTANCE]
    const course = event.course.substring( 0, 1 ).toLocaleUpperCase()
    const pages: Array<PageInfo> = [
      {
        label: `${event.distance}_${event.stroke}_${swimmer.gender}_${event.course}_${swimmer.age}_national`,
        url: createUrl( rankBaseUrl, {
          ...{ Stroke: stroke_distance, Pool: course },
          ...globalRankParams( swimmer ),
          ...nationalRankParams,
        } ),
        type: "ranking"
      },
      {
        label: `${event.distance}_${event.stroke}_${swimmer.gender}_${event.course}_${swimmer.age}_regional`,
        url: createUrl( rankBaseUrl, {
          ...{ Stroke: stroke_distance, Pool: course },
          ...globalRankParams( swimmer ),
          ...{ ...regionalRankParams, ...{ TargetRegion: swimmer.region } }
        } ),
        type: "ranking"
      },
      {
        label: `${event.distance}_${event.stroke}_${swimmer.gender}_${event.course}_${swimmer.age}_county`,
        url: createUrl( rankBaseUrl, {
          ...{ Stroke: stroke_distance, Pool: course },
          ...globalRankParams( swimmer ),
          ...{ ...countyRankParams, ...{ TargetCounty: swimmer.county } }
        } ),
        type: "ranking"
      },
    ]

    const pageCounts = {
      N: 2,
      D: 1,
      C: 1,
    }

    const extraPages = []
    for ( const page of pages ) {
      const url = new URL( page.url )
      const params = url.searchParams
      const pageCount = pageCounts[params.get( "Level" ) as keyof typeof pageCounts]
      for ( let i = 1; i < pageCount; i++ ) {
        params.set( "StartNumber", String( 1 + ( i * 100 ) ) )
        url.search = new URLSearchParams( params ).toString()
        extraPages.push( Object.assign( {}, page, { label: `${page.label}-2`, url } ) )
      }
    }

    for ( const page of pages ) {
      const content = await fetchPage( page )
      // console.log( inspect( pageData, { depth: 5 } ) )
      const $ = cheerio.load( content )

      const rankingData = parseRanking( page, $ )

      const regexp = new RegExp( `(?<distance>\\d+m)_(?<stroke>\\w+)_${swimmer.gender}_(?<course>.c)_${swimmer.age}(?:_(?<area>\\w+))?(?:-(?<page>\\d+))?` )
      const matches = page.label.match( regexp )
      if ( !matches ) {
        throw new Error( "Can't match ranking on '$page.{label}'" )
      }
      const { distance = "", stroke = "", course = "", area = "" } = { ...matches?.groups }

      for ( const row of rankingData.table ) {
        saveRankings.run( { created: today, gender: swimmer.gender, age: swimmer.age, swimmer: "", course, stroke, distance, area, ...row } )
      }
    }
  }
}

const updatePerformance = ( swimmer: Swimmer ) => {
  console.log( `Generating performance data for swimmer '${swimmer.name}'` )

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
}

const updateData = async ( swimmer: Swimmer ) => {
  console.log( `Updating data for swimmer '${swimmer.name}'` )

  const individualData = await updateIndividual( swimmer )

  await updateResults( swimmer, individualData )

  await updateRankings( swimmer, individualData )
  updatePerformance( swimmer )
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
