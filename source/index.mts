#!/usr/bin/env nodemjs
import "dotenv/config"
import { format, parse } from "date-fns"
import cheerio, { Cheerio, CheerioAPI, AnyNode } from "cheerio"
import Database from "better-sqlite3"
import {
  MATCH_NAME,
  STROKE,
  POOLS,
  countyRankParams,
  globalRankParams,
  individualBaseUrl,
  individualParams,
  nationalRankParams,
  rankBaseUrl,
  regionalRankParams,
} from "./config.js"
import { createUrl, fetchPage, rng, sleep, timetoSeconds } from "./lib.js"
import {
  createIndividualSql,
  createPerformanceSql,
  createRankingsSql,
  deletePerformanceSql,
  deleteRankingsSql,
  insertIndividualSql,
  insertPerformanceSql,
  insertRankingsSql,
} from "./database.js"

const now = new Date()
const today = format( now, "yyyy-MM-dd" )

// Create a local database to persist state
const db = new Database( "database/records.db" )
db.pragma( "journal_mode = WAL" );

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
      level: Number( row.level )
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
      level: Number( row.level )
    }
    data.push( courseRow )
  }

  return data
}

const parseRanking = ( $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: Ranking = {
    table: []
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
        level: Number( row.number ),
        date: format( parse( row.date, "dd/MM/yy", now ), "yyyy-MM-dd" ),
        time: timetoSeconds( row.time ),
        fina: Number( row.fina )
      }
      data.table.push( rankingRow )
    }
    const index = table.findIndex( row => row.name === MATCH_NAME )
    if ( index >= 0 ) {
      const rank = data.table[index].rank
      const bestTime = data.table[0].time
      const refTime = data.table[index].time
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

const pages: PageData = [
  {
    label: "individual",
    url: createUrl( individualBaseUrl, individualParams ),
    parser: parseIndividual,
  },
  {
    label: "50m_freestyle_female_lc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_freestyle_female_lc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_freestyle_female_lc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_breaststroke_female_lc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_breaststroke_female_lc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_breaststroke_female_lc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_butterfly_female_lc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_butterfly_female_lc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_butterfly_female_lc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_backstroke_female_lc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_backstroke_female_lc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_backstroke_female_lc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_freestyle_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_freestyle_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_freestyle_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_freestyle_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_freestyle_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_freestyle_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_breaststroke_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_breaststroke_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_breaststroke_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_breaststroke_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_breaststroke_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_breaststroke_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_butterfly_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_butterfly_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_butterfly_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_butterfly_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_butterfly_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_butterfly_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_backstroke_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_backstroke_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "50m_backstroke_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_backstroke_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_backstroke_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_backstroke_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_individual_medley_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_individual_medley_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    parser: parseRanking,
  },
  {
    label: "100m_individual_medley_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    parser: parseRanking,
  },
]

const fetchPages = async () => {
  const data: Record<string,IndividualStats|Ranking> = {}
  for ( const pageInfo of pages ) {
    const content = await fetchPage( pageInfo )
    if ( content ) {
      const $ = cheerio.load( content )
      data[pageInfo.label] = pageInfo.parser( $ )
    }
    sleep( rng() * 60.0 )
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

        for ( const row of individualStats ) {
          saveIndividual.run( { created: today, ...row } )
        }
      } else {
        const ranking = dataset as Ranking

        deleteRankings.run( today, label )
        for ( const row of ranking.table??[] ) {
          saveRankings.run( { created: today, label, ...row } )
        }

        if ( ranking.stats ) {
          deletePerformance.run( today, label )
          savePerformance.run( { created: today, label, ...ranking.stats } )
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
