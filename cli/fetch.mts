#!/usr/bin/env nodemjs
import "dotenv/config"
import { format, parse, differenceInHours, differenceInDays } from "date-fns"
import { stat, readFile, writeFile } from "fs/promises"
import type { AnyNode } from "domhandler"
import * as cheerio from "cheerio"
import type { Cheerio, CheerioAPI } from "cheerio"
import Database from "better-sqlite3"
// import { inspect } from "util"

import {
  CACHE_DIR,
  DEFAULT_CACHE_TIME,
  MAX_FETCH_INTERVAL,
  MIN_FETCH_INTERVAL,
  DB_PATH,
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
  meetsBaseUrl,
  meetsParams,
  BASE_URL,
  insertMeetsSql,
  insertLocationsSql,
  getSwimmerAgeGroup,
} from "lib"

import type {
  Individual,
  IndividualStats,
  LatLon,
  Meet,
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
  "SELECT * FROM Swimmers WHERE active = 1"
)

const insertIndividualSql =
`INSERT OR IGNORE INTO Individual (
  created,
  swimmer,
  course,
  stroke,
  distance,
  time,
  converted_time,
  wa_pts,
  date,
  meet,
  venue,
  licence,
  level
) VALUES (
  :created,
  :swimmer,
  :course,
  :stroke,
  :distance,
  :time,
  :converted_time,
  :wa_pts,
  :date,
  :meet,
  :venue,
  :licence,
  :level
);`

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

const insertRankingsSql =
`INSERT INTO Rankings (
  created,
  gender,
  age,
  course,
  stroke,
  distance,
  scope,
  area,
  rank,
  swimmer,
  ranked_club,
  yob,
  meet_name,
  venue,
  level,
  date,
  time,
  fina
) VALUES (
  :created,
  :gender,
  :age,
  :course,
  :stroke,
  :distance,
  :scope,
  :area,
  :rank,
  :swimmer,
  :ranked_club,
  :yob,
  :meet_name,
  :venue,
  :level,
  :date,
  :time,
  :fina
);`

const saveRankings = db.prepare( insertRankingsSql )

const deletePerformanceSql =
`DELETE FROM Performance WHERE
  created = :created AND
  swimmer = :swimmer AND
  course = :course AND
  stroke = :stroke AND
  distance = :distance AND
  scope = :scope AND
  area = :area
;`

const deletePerformance = db.prepare( deletePerformanceSql )

const insertPerformanceSql =
`INSERT INTO Performance (
  created,
  swimmer,
  course,
  stroke,
  distance,
  scope,
  area,
  position,
  rank,
  best,
  best_date,
  time,
  time_date,
  difference
) VALUES (
  :created,
  :swimmer,
  :course,
  :stroke,
  :distance,
  :scope,
  :area,
  :position,
  :rank,
  :best,
  :best_date,
  :time,
  :time_date,
  :difference
);`

const savePerformance = db.prepare( insertPerformanceSql )

const insertResultsSql =
`INSERT OR IGNORE INTO Results (
  created,
  swimmer,
  course,
  stroke,
  distance,
  time,
  wa_pts,
  round,
  date,
  meet,
  venue,
  club_swam_under,
  level
) VALUES (
  :created,
  :swimmer,
  :course,
  :stroke,
  :distance,
  :time,
  :wa_pts,
  :round,
  :date,
  :meet,
  :venue,
  :club_swam_under,
  :level
);`

const saveResults = db.prepare( insertResultsSql )

const saveMeets = db.prepare( insertMeetsSql )

type RowFunction = ( arg0: CheerioAPI, arg1: Cheerio<AnyNode> ) => Record<string,string>

const extractTableData = ( $: CheerioAPI, table: Cheerio<AnyNode>, rowFunc?: RowFunction ) => {
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

const extractSwimmerId = ( $: CheerioAPI, valueCells: Cheerio<AnyNode> ) => {
  const linkCell = valueCells[1]
  const anchor = $( linkCell ).find( "a" )[0]
  const link = $( anchor ).attr( "href" )
  if ( !link )
    return { swimmer: "unknown" }
  const swimmerId = link.match( /tiref=(\d+)/ )?.[1] ?? ""
  return { swimmer: swimmerId }
}

const parseRanking = ( pageInfo: PageInfo, $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: Ranking = {
    table: [],
  }
  const table = extractTableData( $, $( tables[0] ), extractSwimmerId )
  if ( table.length ) {
    // Do any conversions
    for ( const row of table ) {
      if ( row.name === "Member Hidden" ) {
        continue
      }
      const rankingRow: RankingRow = {
        rank: Number( row.rank ),
        swimmer: row.swimmer,
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

const extractMeetsTableData = ( $: CheerioAPI, table: Cheerio<AnyNode> ) => {
  // const data = await page.evaluate( ( tbody: HTMLTableSectionElement ) => {
  const headers: Array<string> = []
  const dataObject: Array<Record<string, string | string[]>> = []

  const thead = table.find( "thead" )[0]
  $( thead ).find( "tr" ).each( ( rowIndex, rowElement ) => {
    const row = $( rowElement )
    if ( rowIndex === 0 ) {
      row.find( "th" ).each( ( cellIndex, cellElement ) => {
        // console.log( $( cellElement ).text() )
        headers.push( $( cellElement ).text().trim().toLowerCase().replace( /\W+/g, "_" ) )
      } )
      return
    }
  } )

  const tbody = table.find( "tbody" )[0]
  $( tbody ).find( "tr" ).each( ( rowIndex, rowElement ) => {
    const row = $( rowElement )
    const valueCells = row.find( "td div" )
    const rowData: Record<string, string | string[]> = {}
    let headerIndex = 0
    for ( const valueCell of valueCells ) {
      let value: string | string[] = ""
      switch ( headerIndex ) {
        case 0: {
          value = $( valueCell ).children().map( ( i, el ) => $( el ).text().trim() ).get()
          break
        }
        case 1: {
          const details = $( valueCell ).text()
          // value = details.split( / - / )
          value = ( details.match( /^(.*) - (.+)$/ ) || [ null, details, "" ] ).slice( 1 ) as [string, string]
          const anchor = $( valueCell ).find( "a" )[0]
          const link = $( anchor ).attr( "href" ) ?? ""
          value.push( link )
          value.push( link.match( /meet=(\d+)/ )?.[1] ?? "" )
          break
        }
        case 2: {
          const image = $( valueCell ).find( "img" )[0]
          const src = $( image ).attr( "src" ) ?? ""
          value = src.replace( /^.*calendar\/(?:swim-)?/, "" ).replace( /-logo\..*$/, "" )
          break
        }
        case 3: {
          const detail = $( valueCell ).html() ??  ""
          $( valueCell ).html( detail.replace( /<br>/g, "\n" ) )
          value = $( valueCell ).text().trim().split( "\n" )
          break
        }
        default: {
          value = $( valueCell ).text().trim()
          break
        }
      }
      rowData[headers[headerIndex++]] = value
    }
    dataObject.push( rowData )
  } )
  return dataObject
}

const parseMeets = ( pageInfo: PageInfo, $: CheerioAPI ) => {
  const tables = $( "#eventWrapper > table:nth-child(1)" )
  const data: Array<Partial<Meet>> = []
  const table = extractMeetsTableData( $, $( tables[0] ) )
  if ( table.length ) {
    // Do any conversions
    for ( const row of table ) {
      // console.log( row )
      let course = ""
      if ( row.region_level[1] === "Long Course" ) {
        course = "lc"
      } else if ( row.region_level[1] === "Short Course" ) {
        course = "sc"
      } else {
        throw new Error( `Unexpected course '${row.region_level[1]}` )
      }

      const resultRow: Partial<Meet> = {
        id: row.meet_name[3],
        code: row.meet_name[1],
        link: row.meet_name[2],
        date: format( parse( `${row.date[0]} ${row.date[2]}`, "dd MMM yyyy", now ), "yyyy-MM-dd" ),
        name: row.meet_name[0],
        country: row.country as string,
        region: row.region_level[0],
        course,
        level: Number( row.region_level[2].match( /Level (\d+)/ )?.[1] ?? "" ),
        type: row.region_level[3],
      }
      data.push( resultRow )
    }
  }
  return data
}

const getLocation = db.prepare<unknown[],LatLon>(
  "SELECT Latitude, Longitude FROM Locations WHERE Location = :location"
)
const saveLocation = db.prepare( insertLocationsSql )

const geocodeTown = async ( town: string ): Promise<LatLon | undefined> => {
  let latlon = getLocation.get( { location: town } )
  if ( latlon === undefined ) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent( town + ", UK" )}`
    )
    const data = await response.json()
    if ( data && data.length > 0 ) {
      latlon = { latitude: Number( data[0].lat ), longitude: Number( data[0].lon ) }
      saveLocation.run( { created: today, location: town, ...latlon } )
    } else {
      saveLocation.run( { created: today, location: town, latitude: null, longitude: null } )
    }
  }
  return latlon
}

const parseMeet = async ( pageInfo: PageInfo, $: CheerioAPI, meet: Partial<Meet> ) => {
  const startElem = $( "div.cl-event-date:nth-child(2)" )
  const startParts = $( startElem ).children().map( ( i, el ) => $( el ).text().trim() ).get()
  const startDate = parse( `${startParts[1]} ${startParts[3]}`, "dd MMM yyyy", now )
  const endElem = $( "div.cl-event-date:nth-child(3)" )
  const endParts = $( endElem ).children().map( ( i, el ) => $( el ).text().trim() ).get()
  const endDate = parse( `${endParts[1]} ${endParts[3]}`, "dd MMM yyyy", now )

  meet.duration = 1 + differenceInDays( endDate, startDate )

  meet.name = $( ".cl-infobox > h2:nth-child(1)" ).text()

  const details: Record<string, string> = {}
  const list = $( ".cl-infobox > dl:nth-child(2)" )
  list
    .children()
    .each( ( _, el ) => {
      if ( el.tagName.toLowerCase() === "dt" ) {
        const key = $( el ).text().trim().replace( /\W/g, "" )
        const next = $( el ).next( "dd" )
        const value = next.text().trim()
        details[key] = value
      }
    } )
  // console.log( details )

  meet.code = details.Number
  meet.location = details.TownCity
  meet.contact = details.Contact ?? null
  meet.email = details.Email ?? null

  await geocodeTown( meet.location )
}

export const fetchPage = async ( pageInfo: PageInfo, cacheTime: number = DEFAULT_CACHE_TIME ) => {
  const contentFile = CACHE_DIR + "/" + pageInfo.label
  console.log( `Processing ${pageInfo.label} -> ${pageInfo.url}` )
  try {
    const stats = await stat( contentFile )
    // Page has been cached
    const age = differenceInHours( Date.now(), stats.mtime )
    console.log( `Cached: ${age}` )
    if ( age < cacheTime ) {
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "priority": "u=0, i",
        "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "Referer": "https://www.swimmingresults.org/licensed_meets/"
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
    const commonData = {
      gender: swimmer.gender,
      age: ageGroup,
      course: event.course,
      stroke: event.stroke,
      distance: event.distance,
    }
    const pages: Array<PageInfo> = [
      {
        label: `${event.distance}_${event.stroke}_${swimmer.gender}_${event.course}_${swimmer.age}_national`,
        url: createUrl( rankBaseUrl, {
          ...{ Stroke: stroke_distance, Pool: course },
          ...globalRankParams( swimmer ),
          ...nationalRankParams,
        } ),
        type: "ranking",
        data: {
          ...commonData,
          ... {
            scope: "national",
            area: swimmer.nationality,
          }
        }
      },
      {
        label: `${event.distance}_${event.stroke}_${swimmer.gender}_${event.course}_${swimmer.age}_regional`,
        url: createUrl( rankBaseUrl, {
          ...{ Stroke: stroke_distance, Pool: course },
          ...globalRankParams( swimmer ),
          ...{ ...regionalRankParams, ...{ TargetRegion: swimmer.region } }
        } ),
        type: "ranking",
        data: {
          ...commonData,
          ... {
            scope: "regional",
            area: swimmer.region,
          }
        }
      },
      {
        label: `${event.distance}_${event.stroke}_${swimmer.gender}_${event.course}_${swimmer.age}_county`,
        url: createUrl( rankBaseUrl, {
          ...{ Stroke: stroke_distance, Pool: course },
          ...globalRankParams( swimmer ),
          ...{ ...countyRankParams, ...{ TargetCounty: swimmer.county } }
        } ),
        type: "ranking",
        data: {
          ...commonData,
          ... {
            scope: "county",
            area: swimmer.county,
          }
        }
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
        extraPages.push( Object.assign( {}, page, { label: `${page.label}-2`, url, data: page.data } ) )
      }
    }

    for ( const page of pages ) {
      const content = await fetchPage( page )
      // console.log( inspect( pageData, { depth: 5 } ) )
      const $ = cheerio.load( content )

      const rankingData = parseRanking( page, $ )
      for ( const row of rankingData.table ) {
        saveRankings.run( { created: today, ...page.data, ...row } )
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

const updateSwimmerData = async ( swimmer: Swimmer ) => {
  console.log( `Updating data for swimmer '${swimmer.name}'` )

  const individualData = await updateIndividual( swimmer )

  await updateResults( swimmer, individualData )

  await updateRankings( swimmer, individualData )
  updatePerformance( swimmer )
}

const updateMeet = async ( meet: Partial<Meet> ) => {
  const page: PageInfo = {
    label: `meets_${meet.id}`,
    url: new URL( `${BASE_URL}${meetsBaseUrl}${meet.link}` ),
    type: "meet"
  }
  const content = await fetchPage( page, 17 * 24 )
  const $ = cheerio.load( content )

  await parseMeet( page, $, meet )
}

const updateMeets = async () => {
  console.log( "Updating meets" )

  const region = "P"

  let pageNo = 1
  let numPages = 1
  do {
    const page: PageInfo = {
      label: `meets_list_${region}-${pageNo}`,
      url: createUrl( meetsBaseUrl, meetsParams( pageNo, region ) ),
      type: "meets"
    }
    const content = await fetchPage( page )
    // console.log( inspect( pageData, { depth: 5 } ) )
    const $ = cheerio.load( content )

    const meetsData = parseMeets( page, $ )

    // console.log( meetsData )
    console.log( `Got records for ${meetsData.length} meets` )

    for ( const meet of meetsData ) {
      await updateMeet( meet )
      // console.log( meet )
      saveMeets.run( { created: today, ...meet } )
    }

    if ( pageNo === 1 ) {
      const pagination = $( "#eventWrapper > table:nth-child(1) > tfoot:nth-child(3) > tr:nth-child(1) > td:nth-child(1)" )
      const pages = pagination.text()

      const regexp = new RegExp( "Page (?<currPage>\\d+) of (?<maxPages>\\d+)" )
      const matches = pages.match( regexp )
      if ( !matches ) {
        throw new Error( "Can't match pages on '$page.{label}'" )
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { currPage = "", maxPages = "" } = { ...matches?.groups }
      numPages = Number( maxPages )
      // console.log( "Got", currPage, maxPages )
    }
  } while ( ++pageNo <= numPages )
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
        await updateSwimmerData( swimmer )
      }
    }
    if ( process.argv.length === 3 && process.argv[2] === "meets" ) {
      await updateMeets()
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
