#!/usr/bin/env nodemjs
import "dotenv/config"
import { format } from "date-fns"
import * as cheerio from "cheerio"
// import { inspect } from "util"

import {
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
  getSwimmerAgeGroup,
  prepareStatement,
  getPool,
  fetchPage,
  parseIndividual,
  parseResults,
  parseRanking,
  parseMeet,
  parseMeets,
  closePool,
} from "lib"

import type {
  IndividualStats,
  Meet,
  PageInfo,
  Swimmer
} from "lib"

const now = new Date()
const today = format( now, "yyyy-MM-dd" )

const insertIndividualSql =
`INSERT IGNORE INTO Individual (
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

interface RankingRecord {
  rank: number
  course: string
  stroke: string
  distance: string
  scope: string
  area: string
  date: string
  time: number
}

export const deleteRankingsSql =
`DELETE FROM Rankings WHERE
  created = :created AND
  gender = :gender AND
  age = :age AND
  course = :course AND
  stroke = :stroke AND
  distance = :distance AND
  scope = :scope AND
  area = :area`


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

const insertResultsSql =
`INSERT IGNORE INTO Results (
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

const insertMeetsSql =
`INSERT INTO Meets (
  created,
  id,
  code,
  date,
  duration,
  name,
  country,
  region,
  location,
  course,
  level,
  type,
  contact,
  email
)
VALUES (
  :created,
  :id,
  :code,
  :date,
  :duration,
  :name,
  :country,
  :region,
  :location,
  :course,
  :level,
  :type,
  :contact,
  :email
)
ON DUPLICATE KEY UPDATE
  code      = :code,
  date      = :date,
  duration  = :duration,
  name      = :name,
  country   = :country,
  region    = :region,
  location  = :location,
  course    = :course,
  level     = :level,
  type      = :type,
  contact   = :contact,
  email     = :email
;`

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
  const saveIndividual = prepareStatement(
    await getPool(),
    insertIndividualSql
  )
  for ( const row of individualData ) {
    await saveIndividual.run( { ...row, created: today, swimmer: swimmer.id } )
  }

  return individualData
}

const updateResults = async ( swimmer: Swimmer, individualData: Array<IndividualStats> ) => {
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

    const saveResults = prepareStatement( await getPool(), insertResultsSql )
    for ( const result of resultsData ) {
      await saveResults.run( { created: today, swimmer: swimmer.id, course: event.course, stroke: event.stroke, distance: event.distance, ...result } )
    }
  }
}

const updateRankings = async ( swimmer: Swimmer, individualData: Array<IndividualStats> ) => {
  console.log( `Updating ranking data for swimmer '${swimmer.name}'` )

  const ageGroup = getSwimmerAgeGroup( swimmer )
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
        label: `${event.distance}_${event.stroke}_${swimmer.gender}_${event.course}_${ageGroup.toLocaleLowerCase()}_national_${swimmer.nationality.toLocaleLowerCase()}`,
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
        label: `${event.distance}_${event.stroke}_${swimmer.gender}_${event.course}_${ageGroup.toLocaleLowerCase()}_regional_${swimmer.region.toLocaleLowerCase()}`,
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
        label: `${event.distance}_${event.stroke}_${swimmer.gender}_${event.course}_${ageGroup.toLocaleLowerCase()}_county_${swimmer.county.toLocaleLowerCase()}`,
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
    const deleteRankings = prepareStatement( await getPool(), deleteRankingsSql )
    for ( const page of pages ) {
      const url = new URL( page.url )
      const params = url.searchParams
      const pageCount = pageCounts[params.get( "Level" ) as keyof typeof pageCounts]
      for ( let i = 1; i < pageCount; i++ ) {
        params.set( "StartNumber", String( 1 + ( i * 100 ) ) )
        url.search = new URLSearchParams( params ).toString()
        extraPages.push( Object.assign( {}, page, { label: `${page.label}-2`, url, data: page.data } ) )
      }
      await deleteRankings.run( { created: today, ...page.data } )
    }

    const saveRankings = prepareStatement( await getPool(), insertRankingsSql )
    for ( const page of pages.concat( extraPages ) ) {
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

const updatePerformance = async ( swimmer: Swimmer ) => {
  console.log( `Generating performance data for swimmer '${swimmer.name}'` )

  const ageGroup = getSwimmerAgeGroup( swimmer )

  const pool = await getPool()
  const selectMaxCreated = prepareStatement<{ swimmerId: string },{ MaxCreated: string }>(
    pool,
    "SELECT MAX(DATE(created)) AS MaxCreated FROM Rankings WHERE swimmer = :swimmerId",
  )
  const result = await selectMaxCreated.get( { swimmerId: swimmer.id } )
  if ( !result?.MaxCreated ) {
    throw new Error( `No ranking records found for swimmer '${swimmer.id}'` )
  }

  const getSwimmerRankingTimes = prepareStatement<{date:string,swimmer:string},RankingRecord>(
    pool,
    "SELECT course, stroke, distance, scope, area, rank, date, time FROM Rankings WHERE created = :date AND swimmer = :swimmer"
  )
  const swimmerTimes = await getSwimmerRankingTimes.all( { date: result.MaxCreated, swimmer: swimmer.id } )

  const getBestRankingTimes = prepareStatement<{date:string,gender:string,age:string},RankingRecord>(
    pool,
    "SELECT course, stroke, distance, scope, area, date, MIN(time) as time FROM Rankings WHERE created = :date AND gender = :gender AND age = :age GROUP BY gender, age, course, stroke, distance, scope, area"
  )
  const bestTimes = await getBestRankingTimes.all( { date: result.MaxCreated, gender: swimmer.gender, age: ageGroup } )
  const bestTimesMap = new Map( bestTimes.map( time => [ `${time.course}_${time.stroke}_${time.distance}_${time.scope}_${time.area}`, time ] ) )

  // Now generate the performance records
  const deletePerformance = prepareStatement( pool, deletePerformanceSql )
  const savePerformance = prepareStatement( pool, insertPerformanceSql )
  for ( const swimmerTime of swimmerTimes ) {
    const raceLabel = `${swimmerTime.course}_${swimmerTime.stroke}_${swimmerTime.distance}_${swimmerTime.scope}_${swimmerTime.area}`
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
    await deletePerformance.run( { created: today, swimmer: swimmer.id, ...swimmerTime } )
    await savePerformance.run( { created: today, swimmer: swimmer.id, ...swimmerTime, ...record } )
  }
}

const updateSwimmerData = async ( swimmer: Swimmer ) => {
  console.log( `Updating data for swimmer '${swimmer.name}'` )

  const individualData = await updateIndividual( swimmer )

  await updateResults( swimmer, individualData )

  await updateRankings( swimmer, individualData )
  await updatePerformance( swimmer )
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

    const saveMeets = prepareStatement( await getPool(), insertMeetsSql )
    for ( const meet of meetsData ) {
      await updateMeet( meet )
      // console.log( meet )
      await saveMeets.run( { created: today, ...meet } )
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
    const getSwimmers = prepareStatement<void,Swimmer>(
      await getPool(),
      "SELECT * FROM Swimmers WHERE active = 1"
    )

    const swimmers = await getSwimmers.all()
    for ( const swimmer of swimmers ) {
      if ( process.argv.length < 3 || process.argv[2] === swimmer.id ) {
        swimmer.birthday = format( new Date( swimmer.birthday ), "yyyy-MM-dd" )
        try {
          await updateSwimmerData( swimmer )
        } catch ( e ) {
          console.error( "Unable to fetch swimmer data, skipping", e )
        }
      }
    }
    if ( process.argv.length === 3 && process.argv[2] === "meets" ) {
      await updateMeets()
    }
  } catch ( error ) {
    console.error( "Error in script", error )
  } finally {
    closePool()
  }
} )().catch( ( error ) => {
  console.error( "Uncaught error...", error )
} )

process.on( "unhandledRejection", ( reason, promise ) => {
  console.error( "Unhandled rejection in promise:", reason, promise )
} )

process.on( "uncaughtException", ( err ) => {
  console.error( "Uncaught exception:", err )
} )
