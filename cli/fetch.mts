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
  // nationalRankParams,
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
  fetchPageBrowser,
  closeBrowser,
  acquireLock,
} from "lib"

import type {
  IndividualStats,
  Meet,
  PageInfo,
  PoolConnection,
  Swimmer,
  SwimmerUpdateType,
  Task
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

const deletePerformanceSql = "DELETE FROM Performance WHERE swimmer = :id"

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
  seq,
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
  :seq,
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
  locationId,
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
  :locationId,
  :course,
  :level,
  :type,
  :contact,
  :email
)
ON DUPLICATE KEY UPDATE
  code       = :code,
  date       = :date,
  duration   = :duration,
  name       = :name,
  country    = :country,
  region     = :region,
  location   = :location,
  locationId = :locationId,
  course     = :course,
  level      = :level,
  type       = :type,
  contact    = :contact,
  email      = :email
;`

const updateIndividual = async ( swimmer: Swimmer, force: boolean ) => {
  console.log( `Updating individual data for swimmer '${swimmer.fullName}'` )

  const page: PageInfo = {
    label: `individual_${swimmer.id}`,
    url: createUrl( individualBaseUrl, individualParams( swimmer ) ),
    type: "individual"
  }
  const content = await fetchPage( page, force ? 0 : undefined )
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

const updateResultsBatch = async ( swimmer: Swimmer, individualData: Array<IndividualStats>, force: boolean ) => {
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
    const responses = await fetchPages( pages, force ? 0 : undefined )
    const deleteResults = prepareStatement<{id: string}>(
      conn,
      "DELETE FROM Results WHERE swimmer = :id"
    )
    deleteResults.run( swimmer )
    for ( const [ url, content ] of responses.entries() ) {
    // console.log( inspect( pageData, { depth: 5 } ) )
      const page = pages.get( url )
      if ( !page )
        throw new Error( `Can't find page with url '${url}'` )
      const event = page.data as IndividualStats
      const $ = cheerio.load( content )

      const resultsData = parseResults( page as PageInfo, $ )

      const saveResults = prepareStatement( conn, insertResultsSql )
      for ( const [ index, result ] of resultsData.entries() ) {
        await saveResults.run( { swimmer: swimmer.id, course: event.course, stroke: event.stroke, distance: event.distance, seq: index + 1, ...result } )
      }
    }
  }, individualData )
}

const updateRankings = async ( swimmer: Swimmer, individualData: Array<IndividualStats>, force: boolean ) => {
  console.log( `Updating ranking data for swimmer '${swimmer.fullName}'` )

  await runTransaction( await getPool(), async ( conn: PoolConnection, swimmer: Swimmer, individualData: IndividualStats[] ) => {
    const ageGroup = getSwimmerAgeGroup( swimmer )
    const batchPages = new Map<string,PageInfo>()
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
        /* {
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
        }, */
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
        batchPages.set( page.url.toString(), page )
        const url = new URL( page.url )
        const params = url.searchParams
        const pageCount = pageCounts[params.get( "Level" ) as keyof typeof pageCounts]
        for ( let i = 1; i < pageCount; i++ ) {
          params.set( "StartNumber", String( 1 + ( i * 100 ) ) )
          url.search = new URLSearchParams( params ).toString()
          const extraPage = Object.assign( {}, page, { label: `${page.label}-${i + 1}`, url, data: { ...( page.data as object ), pageNo: i + 1 } } )
          extraPages.push( extraPage )
          batchPages.set( url.toString(), extraPage )
        }
        await deleteRankings.run( page.data as object )
      }

      /* for ( const page of pages.concat( extraPages ) ) {
        const content = await fetchPage( page )
        // console.log( inspect( pageData, { depth: 5 } ) )
        const $ = cheerio.load( content )

        const rankingData = parseRanking( page, $ )
        const pageNo = ( page.data as { pageNo?: number } ).pageNo ?? 1
        for ( const [ index, row ] of rankingData.table.entries() ) {
          saveRankings.run( { ...( page.data as object ), ...row, position: ( ( pageNo - 1 ) * 100 ) + ( index + 1 ) } )
        }
      } */
    }

    const saveRankings = prepareStatement( conn, insertRankingsSql )

    const responses = await fetchPages( batchPages, force ? 0 : undefined )
    for ( const [ url, content ] of responses.entries() ) {
      // console.log( inspect( pageData, { depth: 5 } ) )
      const page = batchPages.get( url )
      if ( !page )
        throw new Error( `Can't find page with url '${url}'` )
      const $ = cheerio.load( content )

      const rankingData = parseRanking( page, $ )
      const pageNo = ( page.data as { pageNo?: number } ).pageNo ?? 1
      for ( const [ index, row ] of rankingData.table.entries() ) {
        saveRankings.run( { ...( page.data as object ), ...row, position: ( ( pageNo - 1 ) * 100 ) + ( index + 1 ) } )
      }
    }

  }, swimmer, individualData )
}

const updatePerformance = async ( swimmer: Swimmer ) => {
  console.log( `Generating performance data for swimmer '${swimmer.fullName}'` )

  await runTransaction( await getPool(), async ( conn: PoolConnection, swimmer: Swimmer ) => {

    const ageGroup = getSwimmerAgeGroup( swimmer )

    const getSwimmerRankingTimes = prepareStatement<{swimmer:string,gender:string,age:string},RankingRecord>(
      conn,
      "SELECT course, stroke, distance, scope, area, rank, date, time FROM Rankings WHERE swimmer = :swimmer AND gender = :gender AND age = :age"
    )
    const swimmerTimes = await getSwimmerRankingTimes.all( { swimmer: swimmer.id, gender: swimmer.gender, age: ageGroup } )

    const getBestRankingTimes = prepareStatement<{gender:string,age:string},RankingRecord>(
      conn,
      "SELECT course, stroke, distance, scope, area, date, MIN(time) as time FROM Rankings WHERE gender = :gender AND age = :age GROUP BY gender, age, course, stroke, distance, scope, area"
    )
    const bestTimes = await getBestRankingTimes.all( { gender: swimmer.gender, age: ageGroup } )
    const bestTimesMap = new Map( bestTimes.map( time => [ `${time.course}_${time.stroke}_${time.distance}_${time.scope}_${time.area}`, time ] ) )

    // Now generate the performance records
    const deletePerformance = prepareStatement( conn, deletePerformanceSql )
    await deletePerformance.run( swimmer )
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
      await savePerformance.run( { swimmer: swimmer.id, ...swimmerTime, ...record } )
    }
  }, swimmer )
}

const updateSwimmerData = async ( swimmer: Swimmer, updateType: SwimmerUpdateType, force: boolean ) => {
  console.log( `Updating data for swimmer '${swimmer.fullName}'` )

  const individualData = await updateIndividual( swimmer, force )

  if ( updateType === "results" || updateType === "rankings") {
  // await updateResults( swimmer, individualData )
  await updateResultsBatch( swimmer, individualData, force )

  if ( updateType === "rankings" ) {
    await updateRankings( swimmer, individualData, force )
    await updatePerformance( swimmer )
  }
  }
  const swimmerLastUpdate = prepareStatement(
    await getPool(),
    "UPDATE Swimmers SET lastUpdateTime = NOW(), lastUpdateType = :updateType WHERE id = :id",
  )
  await swimmerLastUpdate.run( { ...swimmer, updateType } )
}

const updateMeet = async ( meet: Partial<Meet>, force: boolean ) => {
  const page: PageInfo = {
    label: `meets_${meet.id}`,
    url: new URL( `${BASE_URL}${meetsBaseUrl}${meet.link}` ),
    type: "meet"
  }
  const content = await fetchPageBrowser( page, force ? 0 : undefined )
  const $ = cheerio.load( content )

  await parseMeet( page, $, meet )
}

const updateMeets = async ( force: boolean ) => {
  console.log( "Updating meets" )

  const pool = await getPool()
  const selectMeets = prepareStatement<unknown[],Meet>( pool, "SELECT * FROM Meets WHERE date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')" )
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
    const content = await fetchPage( page, force ? 0 : undefined )
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
      if ( fetchMeet || force ) {
        try {
        await updateMeet( meet, force )
        // console.log( meet )
        await saveMeets.run( meet )
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch ( error ) {
          console.log( `Unable to update meet '${meet.name}` )
        }
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
  mode: "swimmers" | "meets" | "queue"
  ids?: string[]
  update: SwimmerUpdateType
  force: boolean
}

( async () => {
  acquireLock()

  const program = new Command()

  program
    .name( "fetch" )
    .description( "Fetch data from source site" )

  program.option( "-m, --mode <mode>", "fetch mode 'swimmers', 'meets' or 'queue'" )
  program.option( "-i, --ids <ids...>", "in swimmers mode, fetch data for specified swimmers only" )
  program.option( "-u, --update", "in swimmers mode, what to update. Options are 'individual', 'results' or 'rankings'", "results" )
  program.option( "-f, --force", "force update, ignoring caching time", false )

  // Parse argv
  program.parse( process.argv )

  const options = program.opts<CliOptions>()

  try {
    if ( options.mode === "swimmers" ) {
      const getSwimmers = prepareStatement<void,Swimmer>(
        await getPool(),
        "SELECT * FROM Swimmers WHERE active = 1"
      )
      const swimmerUpdateError = prepareStatement(
        await getPool(),
        "UPDATE Swimmers SET updateStatus = 'error' WHERE id = :id",
      )
      const swimmers = await getSwimmers.all()
      for ( const swimmer of swimmers ) {
        if ( !options.ids || options.ids.find( s => s === swimmer.id ) ) {
          swimmer.birthday = format( new Date( swimmer.birthday ), "yyyy-MM-dd" )
          try {
            await updateSwimmerData( swimmer, options.update, options.force )
          } catch ( e ) {
            console.error( "Unable to fetch swimmer data, skipping", e )
            await swimmerUpdateError.run( swimmer )
          }
        }
      }
    }
    else if ( options.mode === "meets" ) {
      await updateMeets( options.force )
    }
    else if ( options.mode === "queue" ) {
      const getTasks = prepareStatement<void,Task>(
        await getPool(),
        "SELECT * FROM Tasks WHERE taskStatus = 'pending'"
      )
      const taskStart = prepareStatement(
        await getPool(),
        "UPDATE Tasks SET startTime = NOW(), taskStatus = 'progress', taskResult = '' WHERE taskId = :taskId",
      )
      const taskComplete = prepareStatement(
        await getPool(),
        "UPDATE Tasks SET endTime = NOW(), taskStatus = 'complete' WHERE taskId = :taskId",
      )
      const taskUpdateError = prepareStatement(
        await getPool(),
        "UPDATE Tasks SET endTime = NOW(), taskStatus = 'error', taskResult = :taskResult WHERE taskId = :taskId",
      )
      const getSwimmer = prepareStatement<{ id: string },Swimmer>(
        await getPool(),
        "SELECT * FROM Swimmers WHERE id = :id"
      )
      const tasks = await getTasks.all()
      for ( const task of tasks ) {
        try {
          switch ( task.taskType ) {
            case "update" : {
              switch ( task.targetType ) {
                case "swimmer" : {
                  if ( !task.targetId ) {
                    throw new Error( `No target id on task ${task.taskId}` )
                  }
                  const swimmer = await getSwimmer.get( { id: task.targetId } )
                  if ( !swimmer ) {
                    throw new Error( `Can't find swimmer id '${task.targetId}' for task ${task.taskId}` )
                  }
                  swimmer.birthday = format( new Date( swimmer.birthday ), "yyyy-MM-dd" )
                  const taskOptions = new Set<string>( (task.taskOptions ?? "").split( "," ) )
                  await taskStart.run( task )
                  const updateType = taskOptions.has( "individual" ) ? "individual" :
                  ( taskOptions.has( "results" ) ? "results" :
                  ( taskOptions.has( "rankings" ) ? "rankings" : "" ) )
                  if ( !updateType ) {
                    throw new Error( `Can't find update type in task ${task.taskId}` )
                  }
                  await updateSwimmerData( swimmer, updateType, taskOptions.has( "force") )
                  await taskComplete.run( task )
                  break;
                }
              }
              break;
            }
          }
        } catch ( e ) {
          console.error( "Unable to fetch swimmer data, skipping", e )
          task.taskResult = JSON.stringify( e )
          await taskUpdateError.run( task )
        }
      }
    }
  } catch ( error ) {
    console.error( "Error in script", error )
  } finally {
    await closeBrowser()
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
