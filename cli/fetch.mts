#!/usr/bin/env nodemjs
import "dotenv/config"
import { format, formatISO } from "date-fns"
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
  fetchPages,
  runTransaction,
} from "lib"

import type {
  IndividualStats,
  Meet,
  PageInfo,
  PoolConnection,
  Swimmer
} from "lib"
import { Command } from "commander"

const insertIndividualSql =
  `INSERT INTO Individual (
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
  gender = :gender AND
  age = :age AND
  course = :course AND
  stroke = :stroke AND
  distance = :distance AND
  scope = :scope AND
  area = :area`

const insertRankingsSql =
  `INSERT INTO Rankings (
  gender,
  age,
  course,
  stroke,
  distance,
  scope,
  area,
  position,
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
  :gender,
  :age,
  :course,
  :stroke,
  :distance,
  :scope,
  :area,
  :position,
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
  swimmer = :swimmer AND
  course = :course AND
  stroke = :stroke AND
  distance = :distance AND
  scope = :scope AND
  area = :area
;`

const insertPerformanceSql =
  `INSERT INTO Performance (
  swimmer,
  course,
  stroke,
  distance,
  scope,
  area,
  rank,
  best,
  best_date,
  time,
  time_date,
  difference
) VALUES (
  :swimmer,
  :course,
  :stroke,
  :distance,
  :scope,
  :area,
  :rank,
  :best,
  :best_date,
  :time,
  :time_date,
  :difference
);`

const insertResultsSql =
  `INSERT INTO Results (
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
  console.log( `Updating individual data for swimmer '${swimmer.fullName}'` )

  const page: PageInfo = {
    label: `individual_${swimmer.id}`,
    url: createUrl( individualBaseUrl, individualParams( swimmer ) ),
    type: "individual"
  }
  const content = await fetchPage( page )
  // console.log( inspect( pageData, { depth: 5 } ) )
  const $ = cheerio.load( content )

  const individualData = parseIndividual( page, $ )

  await runTransaction( await getPool(), async ( conn: PoolConnection, individualData: IndividualStats[] ) => {
    console.log( `Got records for ${individualData.length} events` )
    const deleteIndividual = prepareStatement<{id: string}>(
      conn,
      "DELETE FROM Individual WHERE swimmer = :id"
    )
    deleteIndividual.run( swimmer )
    const saveIndividual = prepareStatement(
      conn,
      insertIndividualSql
    )
    for ( const row of individualData ) {
      await saveIndividual.run( { ...row, swimmer: swimmer.id } )
    }
  }, individualData )

  return individualData
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateResults = async ( swimmer: Swimmer, individualData: Array<IndividualStats> ) => {
  console.log( `Updating results data for swimmer '${swimmer.fullName}'` )

  await runTransaction( await getPool(), async ( conn: PoolConnection, individualData: IndividualStats[] ) => {
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

      const deleteResults = prepareStatement<{id: string}>(
        conn,
        "DELETE FROM Results WHERE swimmer = :id"
      )
      deleteResults.run( swimmer )

      const saveResults = prepareStatement( conn, insertResultsSql )
      for ( const result of resultsData ) {
        await saveResults.run( { swimmer: swimmer.id, course: event.course, stroke: event.stroke, distance: event.distance, ...result } )
      }
    }
  }, individualData )
}

const updateResultsBatch = async ( swimmer: Swimmer, individualData: Array<IndividualStats> ) => {
  console.log( `Updating results data for swimmer '${swimmer.fullName}'` )

  await runTransaction( await getPool(), async ( conn: PoolConnection, individualData: IndividualStats[] ) => {
    const pages = new Map<string,PageInfo>()
    for ( const event of individualData ) {
      const stroke_distance = STROKE_DISTANCE[`${event.stroke}__${event.distance}`.toLocaleUpperCase() as keyof typeof STROKE_DISTANCE]
      const course = event.course.substring( 0, 1 ).toLocaleUpperCase()

      const page: PageInfo = {
        label: `${event.distance}_${event.stroke}_${event.course}_${swimmer.id}`,
        url: createUrl( resultsBaseUrl, {
          ...resultsParams( swimmer ),
          ...{ tstroke: stroke_distance, tcourse: course },
        } ),
        type: "results",
        data: event,
      }
      pages.set( page.url.toString(), page )
    }
    const responses = await fetchPages( pages )
    for ( const [ url, content ] of responses.entries() ) {
    // console.log( inspect( pageData, { depth: 5 } ) )
      const page = pages.get( url )
      if ( !page )
        throw new Error( `Can't find page with url '${url}'` )
      const event = page.data as IndividualStats
      const $ = cheerio.load( content )

      const resultsData = parseResults( page as PageInfo, $ )

      const deleteResults = prepareStatement<{id: string}>(
        conn,
        "DELETE FROM Results WHERE swimmer = :id"
      )
      deleteResults.run( swimmer )

      const saveResults = prepareStatement( conn, insertResultsSql )
      for ( const result of resultsData ) {
        await saveResults.run( { swimmer: swimmer.id, course: event.course, stroke: event.stroke, distance: event.distance, ...result } )
      }
    }
  }, individualData )
}

const updateRankings = async ( swimmer: Swimmer, individualData: Array<IndividualStats> ) => {
  console.log( `Updating ranking data for swimmer '${swimmer.fullName}'` )

  await runTransaction( await getPool(), async ( conn: PoolConnection, swimmer: Swimmer, individualData: IndividualStats[] ) => {
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
      const deleteRankings = prepareStatement( conn, deleteRankingsSql )
      for ( const page of pages ) {
        const url = new URL( page.url )
        const params = url.searchParams
        const pageCount = pageCounts[params.get( "Level" ) as keyof typeof pageCounts]
        for ( let i = 1; i < pageCount; i++ ) {
          params.set( "StartNumber", String( 1 + ( i * 100 ) ) )
          url.search = new URLSearchParams( params ).toString()
          extraPages.push( Object.assign( {}, page, { label: `${page.label}-${i + 1}`, url, data: { ...( page.data as object ), pageNo: i + 1 } } ) )
        }
        await deleteRankings.run( page.data as object )
      }

      const saveRankings = prepareStatement( conn, insertRankingsSql )
      for ( const page of pages.concat( extraPages ) ) {
        const content = await fetchPage( page )
        // console.log( inspect( pageData, { depth: 5 } ) )
        const $ = cheerio.load( content )

        const rankingData = parseRanking( page, $ )
        const pageNo = ( page.data as { pageNo?: number } ).pageNo ?? 1
        for ( const [ index, row ] of rankingData.table.entries() ) {
          saveRankings.run( { ...( page.data as object ), ...row, position: ( ( pageNo - 1 ) * 100 ) + ( index + 1 ) } )
        }
      }
    }
  }, swimmer, individualData )
}

const updatePerformance = async ( swimmer: Swimmer ) => {
  console.log( `Generating performance data for swimmer '${swimmer.fullName}'` )

  await runTransaction( await getPool(), async ( conn: PoolConnection, swimmer: Swimmer ) => {

    const ageGroup = getSwimmerAgeGroup( swimmer )

    const getSwimmerRankingTimes = prepareStatement<{swimmer:string},RankingRecord>(
      conn,
      "SELECT course, stroke, distance, scope, area, rank, date, time FROM Rankings WHERE swimmer = :swimmer"
    )
    const swimmerTimes = await getSwimmerRankingTimes.all( { swimmer: swimmer.id } )

    const getBestRankingTimes = prepareStatement<{gender:string,age:string},RankingRecord>(
      conn,
      "SELECT course, stroke, distance, scope, area, date, MIN(time) as time FROM Rankings WHERE gender = :gender AND age = :age GROUP BY gender, age, course, stroke, distance, scope, area"
    )
    const bestTimes = await getBestRankingTimes.all( { gender: swimmer.gender, age: ageGroup } )
    const bestTimesMap = new Map( bestTimes.map( time => [ `${time.course}_${time.stroke}_${time.distance}_${time.scope}_${time.area}`, time ] ) )

    // Now generate the performance records
    const deletePerformance = prepareStatement( conn, deletePerformanceSql )
    const savePerformance = prepareStatement( conn, insertPerformanceSql )
    for ( const swimmerTime of swimmerTimes ) {
      const raceLabel = `${swimmerTime.course}_${swimmerTime.stroke}_${swimmerTime.distance}_${swimmerTime.scope}_${swimmerTime.area}`
      const bestTime = bestTimesMap.get( raceLabel )
      if ( !bestTime ) {
        throw new Error( `Unable to find best time record for '${raceLabel}` )
      }
      const record = {
        rank: swimmerTime.rank,
        best: bestTime.time,
        best_date: bestTime.date,
        time: swimmerTime.time,
        time_date: swimmerTime.date,
        difference: swimmerTime.time - bestTime.time,
      }
      await deletePerformance.run( { swimmer: swimmer.id, ...swimmerTime } )
      await savePerformance.run( { swimmer: swimmer.id, ...swimmerTime, ...record } )
    }
  }, swimmer )
}

const updateSwimmerData = async ( swimmer: Swimmer, relative: boolean ) => {
  console.log( `Updating data for swimmer '${swimmer.fullName}'` )

  const individualData = await updateIndividual( swimmer )

  // await updateResults( swimmer, individualData )
  await updateResultsBatch( swimmer, individualData )

  if ( relative ) {
    await updateRankings( swimmer, individualData )
    await updatePerformance( swimmer )
  }

  const swimmerUpdate = prepareStatement(
    await getPool(),
    "UPDATE Swimmers SET lastUpdateTime = NOW(), lastUpdateType = :type WHERE id = :id",
  )
  await swimmerUpdate.run( { ...swimmer, type: relative ? "full" : "lite"} )
}

const updateMeet = async ( meet: Partial<Meet> ) => {
  const page: PageInfo = {
    label: `meets_${meet.id}`,
    url: new URL( `${BASE_URL}${meetsBaseUrl}${meet.link}` ),
    type: "meet"
  }
  const content = await fetchPage( page )
  const $ = cheerio.load( content )

  await parseMeet( page, $, meet )
}

const updateMeets = async () => {
  console.log( "Updating meets" )

  const pool = await getPool()
  const selectMeets = prepareStatement<unknown[],Meet>( pool, "SELECT * FROM Meets WHERE date > CURDATE()" )
  const meets = await selectMeets.all()
  const meetsMap = new Map<Meet["id"],Meet>( meets.map( m => ( [ m.id, m ] ) ) )
  const fetchedMeets = new Set<Meet["id"]>()

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

    const saveMeets = prepareStatement( pool, insertMeetsSql )
    for ( const meet of meetsData ) {
      let fetchMeet = true
      if ( !meet.id ) {
        throw new Error( "Meet has no id" )
      }
      fetchedMeets.add( meet.id )
      const dbMeet = meetsMap.get( meet.id )
      if ( dbMeet ) {
        if (
          meet.name !== dbMeet.name
          || !meet.code?.includes( dbMeet.code, 1 )
          || meet.date !== formatISO( dbMeet.date, { representation: "date" } )
          || meet.country !== dbMeet.country
          || meet.region !== dbMeet.region
          || meet.course !== dbMeet.course
          || meet.level !== dbMeet.level
          || meet.type !== dbMeet.type
        ) {
          console.log( "Updated meet", meet, dbMeet )
        } else {
          fetchMeet = false
        }
      } else {
        console.log( "New meet", meet )
      }
      if ( fetchMeet ) {
        await updateMeet( meet )
        // console.log( meet )
        await saveMeets.run( meet )
      }
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
  const deletedMeets = new Set( meetsMap.keys() ).difference( fetchedMeets )
  const deleteMeet = prepareStatement<{ meetId: string }>( pool, "DELETE FROM Meets WHERE id = :meetId" )
  for ( const meetId of deletedMeets ) {
    console.log( `Deleting meet ${meetId}` )
    await deleteMeet.run( { meetId } )
  }
}

// Extract options in a typed way
interface CliOptions {
  mode?: "swimmers" | "meets"
  ids?: string[]
  relative: boolean
}

( async () => {
  const program = new Command()

  program
    .name( "fetch" )
    .description( "Fetch data from source site" )

  program.option( "-m, --mode <mode>", "fetch mode 'swimmer' or 'meets'" )
  program.option( "-i, --ids <ids...>", "fetch data for specified swimmers only" )
  program.option( "-r, --relative", "fetch data relative to other swimmers alongside basic info", false )

  // Parse argv
  program.parse( process.argv )

  const options = program.opts<CliOptions>()

  try {
    if ( !options.mode || options.mode === "swimmers" ) {
      const getSwimmers = prepareStatement<void,Swimmer>(
        await getPool(),
        "SELECT * FROM Swimmers WHERE active = 1"
      )

      const swimmers = await getSwimmers.all()
      for ( const swimmer of swimmers ) {
        if ( !options.ids || options.ids.find( s => s === swimmer.id ) ) {
          swimmer.birthday = format( new Date( swimmer.birthday ), "yyyy-MM-dd" )
          try {
            await updateSwimmerData( swimmer, !!options.relative )
          } catch ( e ) {
            console.error( "Unable to fetch swimmer data, skipping", e )
          }
        }
      }
    }
    if ( !options.mode || options.mode === "meets" ) {
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
