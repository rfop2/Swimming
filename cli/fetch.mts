#!/usr/bin/env nodemjs
import "dotenv/config"
import { format, parse } from "date-fns"
import cheerio, { type Cheerio, type CheerioAPI, type AnyNode } from "cheerio"
import Database from "better-sqlite3"
// import { inspect } from "util"

import {
  DB_PATH,
  MATCH_NAME,
} from "../lib/config.js"
import {
  createIndividualSql,
  createPerformanceSql,
  createRankingsSql,
  createResultsSql,
  deletePerformanceSql,
  deleteRankingsSql,
  insertIndividualSql,
  insertPerformanceSql,
  insertRankingsSql,
  insertResultsSql,
} from "../lib/database.js"
import { fetchPage, shuffle, timetoSeconds } from "../lib/lib.js"
import { pages } from "../lib/pages.js"

const now = new Date()
const today = format( now, "yyyy-MM-dd" )

// Create a local database to persist state
const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" )

// Create tables, and prepare statements
const individualTableCreate = db.prepare( createIndividualSql )
individualTableCreate.run()

const saveIndividual = db.prepare( insertIndividualSql )

const rankingsTableCreate = db.prepare( createRankingsSql )
rankingsTableCreate.run()

const deleteRankings = db.prepare( deleteRankingsSql )

const saveRankings = db.prepare( insertRankingsSql )

const performanceTableCreate = db.prepare( createPerformanceSql )
performanceTableCreate.run()

const deletePerformance = db.prepare( deletePerformanceSql )

const savePerformance = db.prepare( insertPerformanceSql )

const resultsTableCreate = db.prepare( createResultsSql )
resultsTableCreate.run()

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

const parseIndividual = ( $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: IndividualStats = []
  const longCourse = extractTableData( $, $( tables[0] ) )
  for ( const row of longCourse ) {
    const courseRow: Individual = {
      course: "long",
      stroke: row.stroke,
      time: timetoSeconds( row.lc_time ),
      converted_time: timetoSeconds( row.converted_to_sc ),
      wa_pts: Number( row.lc_wa_pts ),
      date: format( parse( row.date, "dd/MM/yy", now ), "yyyy-MM-dd" ),
      meet: row.meet,
      venue: row.venue,
      licence: row.licence,
      level: Number( row.level ),
    }
    data.push( courseRow )
  }

  const shortCourse = extractTableData( $, $( tables[1] ) )
  for ( const row of shortCourse ) {
    const courseRow: Individual = {
      course: "short",
      stroke: row.stroke,
      time: timetoSeconds( row.sc_time ),
      converted_time: timetoSeconds( row.converted_to_lc ),
      wa_pts: Number( row.sc_wa_pts ),
      date: format( parse( row.date, "dd/MM/yy", now ), "yyyy-MM-dd" ),
      meet: row.meet,
      venue: row.venue,
      licence: row.licence,
      level: Number( row.level ),
    }
    data.push( courseRow )
  }

  return data
}

const parseRanking = ( $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: Ranking = {
    table: [],
  }
  const table = extractTableData( $, $( tables[0] ) )
  if ( table.length ) {
    // Do any conversions
    for ( const row of table ) {
      const rankingRow: RankingRow = {
        rank: Number( row.rank ),
        name: row.name,
        ranked_club: row.ranked_club,
        yob: Number( row.yob ),
        meet_name: row.meet_name,
        venue: row.venue,
        level: Number( row.level ),
        date: format( parse( row.date, "dd/MM/yy", now ), "yyyy-MM-dd" ),
        time: timetoSeconds( row.time ),
        fina: Number( row.fina ),
      }
      data.table.push( rankingRow )
    }
    const index = table.findIndex( ( row ) => row.name === MATCH_NAME )
    if ( index >= 0 ) {
      const rank = data.table[index].rank
      const bestTime = data.table[0].time
      const refTime = data.table[index].time
      const deltaTime = refTime - bestTime
      data.stats = {
        position: index + 1,
        rank,
        best: bestTime,
        time: refTime,
        difference: deltaTime,
      }
    }
  }
  return data
}

const parseResults = ( $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: Results = []
  const table = extractTableData( $, $( tables[1] ) )
  if ( table.length ) {
    // Do any conversions
    for ( const row of table ) {
      const resultRow: Result = {
        time: timetoSeconds( row.time ),
        wa_pts: Number( row.sc_wa_pts ),
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

const fetchPages = async () => {
  const data: PageData = {
    individual: [],
    ranking: {},
    results: {}
  }
  for ( const pageInfo of shuffle( pages ) ) {
    const content = await fetchPage( pageInfo )
    if ( content ) {
      const $ = cheerio.load( content )
      switch ( pageInfo.type ) {
        case "individual": {
          data[pageInfo.type] = parseIndividual( $ )
          break
        }
        case "ranking" : {
          data[pageInfo.type][pageInfo.label] = parseRanking( $ )
          break
        }
        case "results" : {
          data[pageInfo.type][pageInfo.label] = parseResults( $ )
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

const updateData = async () => {
  try {
    const pageData = await fetchPages()
    // console.log( inspect( pageData, { depth: 5 } ) )

    for ( const row of pageData.individual ) {
      saveIndividual.run( { created: today, ...row } )
    }
    for ( const [ label, ranking ] of Object.entries( pageData.ranking ) ) {
      deleteRankings.run( today, label )
      for ( const row of ranking.table ) {
        saveRankings.run( { created: today, label, ...row } )
      }
      if ( ranking.stats ) {
        deletePerformance.run( today, label )
        savePerformance.run( { created: today, label, ...ranking.stats } )
      }
    }
    for ( const [ label, results ] of Object.entries( pageData.results ) ) {
      for ( const result of results ) {
        saveResults.run( { created: today, label, ...result } )
      }
    }
  } catch ( error ) {
    console.error( "General error", error )
    process.exit( -1 )
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

  await updateData()

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
