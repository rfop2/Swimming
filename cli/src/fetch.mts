#!/usr/bin/env nodemjs
import "dotenv/config"
import { format, formatISO, parse, sub } from "date-fns"
import * as cheerio from "cheerio"

// import { inspect } from "util"

import {
  createUrl,
  individualBaseUrl,
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
  individualRecentParams,
  individualAllTimeParams,
  meetsResultsBaseUrl,
  meetsResultsParams,
  parseMeetsResults,
  meetResultsBaseUrl,
  meetResultsParams,
  parseMeetResults,
  setupNordFetch,
} from "lib"

import type {
  Club,
  IndividualStats,
  Meet,
  MeetResults,
  PageInfo,
  PoolConnection,
  Swimmer,
  SwimmerUpdateMode,
  SwimmerUpdateType,
  Task
} from "lib"
import { Command, Option } from "commander"
import { addClubSwimmers } from "./lib.js"
import type { User } from "lucia"

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

const checkIndividual = async ( swimmer: Swimmer ) => {
  console.log( `Checking recent individual data for swimmer '${swimmer.fullName}'` )

  const page: PageInfo = {
    label: `individual_${swimmer.id}_recent`,
    url: createUrl( individualBaseUrl, individualRecentParams( swimmer ) ),
    type: "individual"
  }
  const { age, content } = await fetchPage( page )
  // console.log( inspect( pageData, { depth: 5 } ) )
  const $ = cheerio.load( content )
  const individualData = parseIndividual( page, $ )

  const updateData: IndividualStats[] = []
  if ( age > 0 ) {
    const { content: fetchedContent } = await fetchPage( page, 0 )
    const $ = cheerio.load( fetchedContent )
    const fetchedData = parseIndividual( page, $ )

    for ( const row of fetchedData ) {
      const prevRow = individualData.find( r => {
        if ( r.course !== row.course ) return false
        if ( r.stroke !== row.stroke ) return false
        if ( r.distance !== row.distance ) return false
        return true
      } )
      if ( !prevRow ) {
        updateData.push( row )
      } else {
        if ( row.time !== prevRow.time || row.date !== row.date || row.meet !== row.meet ) {
          updateData.push( row )
        }
      }
    }
    return updateData
  }
  return []
}

const updateIndividual = async ( swimmer: Swimmer, force: boolean ) => {
  console.log( `Updating individual data for swimmer '${swimmer.fullName}'` )

  const page: PageInfo = {
    label: `individual_${swimmer.id}`,
    url: createUrl( individualBaseUrl, individualAllTimeParams( swimmer ) ),
    type: "individual"
  }
  const { content } = await fetchPage( page, force ? 0 : undefined )
  // console.log( inspect( pageData, { depth: 5 } ) )
  const $ = cheerio.load( content )
  const individualData = parseIndividual( page, $ )

  await runTransaction( await getPool(), async ( conn: PoolConnection, individualData: IndividualStats[] ) => {
    console.log( `Got records for ${individualData.length} events` )
    const deleteIndividual = prepareStatement<{id: string}>(
      conn,
      "DELETE FROM Individual WHERE swimmer = :id"
    )
    await deleteIndividual.run( swimmer )
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
    await deleteResults.run( swimmer )
    for ( const [ url, { content } ] of responses.entries() ) {
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
    for ( const [ url, { content } ] of responses.entries() ) {
      // console.log( inspect( pageData, { depth: 5 } ) )
      const page = batchPages.get( url )
      if ( !page )
        throw new Error( `Can't find page with url '${url}'` )
      const $ = cheerio.load( content )

      const rankingData = parseRanking( page, $ )
      const pageNo = ( page.data as { pageNo?: number } ).pageNo ?? 1
      for ( const [ index, row ] of rankingData.table.entries() ) {
        await saveRankings.run( { ...( page.data as object ), ...row, position: ( ( pageNo - 1 ) * 100 ) + ( index + 1 ) } )
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

const updateSwimmerData = async ( swimmer: Swimmer, updateType: SwimmerUpdateType, mode: SwimmerUpdateMode ) => {
  console.log( `Updating data for swimmer '${swimmer.fullName}'` )
  swimmer.birthday = format( new Date( swimmer.birthday ), "yyyy-MM-dd" )

  const individualData: IndividualStats[] = []
  const force = ( mode !== "lazy" )
  if ( mode === "smart" ) {
    const updateData = await checkIndividual( swimmer )
    individualData.push( ...updateData )
  } else {
    const updateData = await updateIndividual( swimmer, force )
    individualData.push( ...updateData )
  }

  if ( updateType === "results" || updateType === "rankings" ) {
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
  const { content } = await fetchPageBrowser( page, force ? 0 : undefined )
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
  const counts = {
    created: 0,
    updated: 0,
    deleted: 0,
  }
  const saveMeets = prepareStatement( pool, insertMeetsSql )
  do {
    const page: PageInfo = {
      label: `meets_list_${region}-${pageNo}`,
      url: createUrl( meetsBaseUrl, meetsParams( pageNo, region ) ),
      type: "meets"
    }
    const { content } = await fetchPage( page, force ? 0 : undefined )
    // console.log( inspect( pageData, { depth: 5 } ) )
    const $ = cheerio.load( content )

    const meetsData = parseMeets( page, $ )

    // console.log( meetsData )
    console.log( `Got records for ${meetsData.length} meets` )

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
          counts.updated++
        } else {
          fetchMeet = false
        }
      } else {
        console.log( "New meet", meet )
        counts.created++
      }
      if ( fetchMeet || force ) {
        try {
          await updateMeet( meet, force )
          // console.log( meet )
          await saveMeets.run( meet )
        } catch ( error ) {
          console.log( `Unable to update meet '${meet.name}'`, error )
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
  /* const deletedMeets = new Set( meetsMap.keys() ).difference( fetchedMeets )
  const deleteMeet = prepareStatement<{ meetId: string }>( pool, "DELETE FROM Meets WHERE id = :meetId" )
  for ( const meetId of deletedMeets ) {
    console.log( `Deleting meet ${meetId}` )
    await deleteMeet.run( { meetId } )
    counts.deleted++
  } */
  console.log( `Found ${counts.created} new meets, ${counts.updated} updated meets and ${counts.deleted} deleted meets` )
}

interface MeetsResultsOptions {
  region?: string
  county?: string[]
  club?: string[]
  force?: boolean
}

const getMeetSwimmers = async ( meetResults: MeetResults, year: string, options: MeetsResultsOptions ) => {
  console.log( `Getting meet swimmers for meet '${meetResults.name}'` )

  const meetSwimmers = new Set<Swimmer["id"]>()

  const clubs: string[] = []
  let clubIndex = 0
  do {
    const club = clubs.length ? clubs[clubIndex] : undefined
    let pageNo = 1
    let numPages = 1

    do {
      const page: PageInfo = {
        label: `meet_results_${meetResults.id}${club ? ( "-" + club ) : ""}-${pageNo}`,
        url: createUrl( meetResultsBaseUrl, meetResultsParams( year, meetResults.id, club, pageNo > 1 ? pageNo : undefined ) ),
        type: "meetResults"
      }
      const { content } = await fetchPage( page, options.force ? 0 : undefined )
      // console.log( inspect( pageData, { depth: 5 } ) )
      const $ = cheerio.load( content )

      if ( !clubs.length ) {
        clubs.push(
          ...$( "#clubtarget > option" )
            .get()
            .map( o => $( o ).attr( "value" ) )
            .filter( o => o !== undefined )
            .filter( o => !options.county || options.county.includes( o.substring( 4 ) ) )
            .filter( o => !options.club || options.club.includes( o.substring( 0, 4 ) ) )
        )
        if ( !clubs[clubIndex] )  {
          // The default club isn't in the list
          break
        }
      }

      if ( pageNo === 1 ) {
        const pages = $( "#outerWrapper > div:nth-child(2) > div.boxRepeat.rankingsContent > p:nth-child(3)" )
        if ( pages.text().match( /Pages/ ) ) {
          const pageLinks = $( "#outerWrapper > div:nth-child(2) > div.boxRepeat.rankingsContent > p:nth-child(3) > a" )
          numPages = pageLinks.length
          // console.log( `Found ${numPages} pages` )
        }
      }

      const pageSwimmers = parseMeetResults( page, $ )
      if ( pageSwimmers.size ) {
        console.log( `Got ${pageSwimmers.size} page swimmer ids` )
      }
      pageSwimmers.forEach( id => meetSwimmers.add( id ) )
    } while ( ++pageNo <= numPages )
  } while ( ++clubIndex < clubs.length )
  return meetSwimmers
}

const updateMeetsResults = async ( options: MeetsResultsOptions ) => {
  console.log( "Updating meets results" )

  const MAX_MEETS_RESULTS = 100

  const pool = await getPool()
  const selectLastResultsUpdate = prepareStatement<void,{value: string}>( pool, "SELECT value FROM System WHERE name = 'lastResultsUpdate'" )
  const lastResultsUpdate = await selectLastResultsUpdate.get()

  const resultsSwimmers = new Set<Swimmer["id"]>()

  const now = new Date()
  const today = format( now, "yyyy-MM-dd" )
  const thisYear = format( now, "yyyy" )

  let pageNo = 1
  let fetchNextPage = false
  do {
    const page: PageInfo = {
      label: `meet_results_list-${today}-${pageNo}`,
      url: createUrl( meetsResultsBaseUrl, meetsResultsParams( thisYear, pageNo ) ),
      type: "meetsResults"
    }
    const { content } = await fetchPage( page, options.force ? 0 : undefined )
    // console.log( inspect( pageData, { depth: 5 } ) )
    const $ = cheerio.load( content )

    const firstMeetDate = lastResultsUpdate ? parse( lastResultsUpdate.value, "yyyy-MM-dd", new Date() ) : sub( now, { months: 1 } )
    const meetsResultsData = parseMeetsResults( page, $, firstMeetDate )

    // console.log( meetsData )
    console.log( `Got records for ${meetsResultsData.length} meets results` )

    for ( const meetResults of meetsResultsData ) {
      try {
        if ( !options.region || meetResults.code.startsWith( options.region ) ) {
          const meetSwimmers = await getMeetSwimmers( meetResults, thisYear, options )
          meetSwimmers.forEach( id => resultsSwimmers.add( id ) )
          if ( meetSwimmers.size ) {
            console.log( `Got ${meetSwimmers.size} meet swimmer ids` )
          }
        }
      } catch ( _error ) {
        console.log( `Unable to get meet results swimmers for '${meetResults.name}` )
      }
    }

    if ( meetsResultsData.length >= MAX_MEETS_RESULTS ) {
      fetchNextPage = true
      pageNo++
    } else {
      fetchNextPage = false
    }
  } while ( fetchNextPage )
  if ( resultsSwimmers.size ) {
    console.log( `Got ${resultsSwimmers.size} swimmer ids to check and update` )
  }
  await runTransaction( pool, async ( conn: PoolConnection ) => {
    const getSystemUser = prepareStatement<void>( conn, "SELECT * FROM User WHERE type = 'system'" )
    const systemUser = await getSystemUser.get()
    if ( !systemUser ) {
      throw new Error( "Can't find system user in database" )
    }
    const addTask = prepareStatement(
      conn,
      `INSERT INTO Tasks (
        creatorId, taskType, taskOptions, taskDescription, targetType, targetId
      )
      SELECT
        :userId, :taskType, :taskOptions, :taskDescription, :targetType, :targetId
      WHERE EXISTS (
        SELECT 1 FROM Swimmers WHERE Swimmers.id = :targetId
      )`
    )
    let swimmersToUpdate = 0
    for( const swimmerId of resultsSwimmers ) {
      const result = await addTask.run( {
        userId: systemUser.id,
        taskType: "update",
        taskOptions: JSON.stringify( { updateType: "rankings" } ),
        taskDescription: "Triggered rankings update from meet results",
        targetType: "swimmer",
        targetId: swimmerId
      } )
      swimmersToUpdate += result.affectedRows
      if ( result.affectedRows ) {
        console.log( `Queued update for swimmer ${swimmerId}` )
      }
    }
    if ( swimmersToUpdate ) {
      console.log( `Queued ranking updates for ${swimmersToUpdate} swimmers` )
    }
    const updateLastResultsUpdate = prepareStatement<{value: string}>( conn, "INSERT INTO System VALUES( 'lastResultsUpdate', :value ) ON DUPLICATE KEY UPDATE value = :value" )
    await updateLastResultsUpdate.run( { value: today } )
  } )
}

( async () => {
  await acquireLock()

  const program = new Command()

  program
    .name( "fetch" )
    .description( "Fetch and update data from source site" )

  program.showHelpAfterError()

  program.command( "swimmers" )
    .description( "Fetch swimmer data" )
    .option( "-i, --id <ids...>", "fetch data for specified swimmers" )
    .option( "-c, --club <club>", "fetch data for swimmers in specified club only" )
    .addOption( new Option( "-u, --update <update>", "what level of swimmer data to update" ).choices( [ "individual", "results", "rankings" ] ) )
    .addOption( new Option( "-m, --mode <mode>", "fetching strategy versus caching" ).choices( [ "force", "smart", "lazy" ] ).default( "lazy" ) )
    .action( async ( options ) => {
      const getSwimmers = prepareStatement<void,Swimmer>(
        await getPool(),
        "SELECT * FROM Swimmers WHERE active = 1"
      )
      const getClubSwimmers = prepareStatement<{clubId: string},Swimmer>(
        await getPool(),
        "SELECT Swimmers.* FROM Swimmers INNER JOIN ClubSwimmers ON (Swimmers.id = ClubSwimmers.swimmerId) INNER JOIN Clubs ON (ClubSwimmers.clubId = Clubs.clubId) WHERE Clubs.ClubId = :clubId AND Swimmers.active = 1"
      )
      const swimmerUpdateError = prepareStatement(
        await getPool(),
        "UPDATE Swimmers SET updateStatus = 'error' WHERE id = :id",
      )
      const swimmers = await ( options.club ? getClubSwimmers.all( { clubId: options.club } ) : getSwimmers.all() )
      if ( !swimmers.length ) {
        console.log( "No swimmers found, exiting" )
        process.exit( 0 )
      }
      for ( const swimmer of swimmers ) {
        if ( !options.ids || options.ids.find( ( s: string ) => s === swimmer.id ) ) {
          try {
            await updateSwimmerData( swimmer, options.update, options.mode )
          } catch ( e ) {
            console.error( "Unable to fetch swimmer data, skipping", e )
            await swimmerUpdateError.run( swimmer )
          }
        }
      }
    } )

  program.command( "results" )
    .description( "Fetch recent results listings and identify swimmers that need updates" )
    .option( "-r, --region <region>", "only fetch results for the specified region" )
    .option( "-c, --county <county...>", "only fetch results for the specified counties" )
    .option( "-C, --club <club...>", "only fetch results for the specified clubs" )
    .addOption( new Option( "-m, --mode <mode>", "fetching strategy versus caching" ).choices( [ "force", "lazy" ] ).default( "lazy" ) )
    .action( async ( options: MeetsResultsOptions ) => {
      try {
        await updateMeetsResults( options )
      } catch ( e ) {
        console.error( "Unable to update meet results", e )
      }
    } )

  program.command( "meets" )
    .description( "Fetch data for new or updated meets" )
    .addOption( new Option( "-m, --mode <mode>", "fetching strategy versus caching" ).choices( [ "force", "lazy" ] ).default( "lazy" ) )
    .action( async ( options ) => {
      try {
        await updateMeets( options.mode === "force" )
      } catch ( e ) {
        console.error( "Unable to update meets", e )
      }
    } )

  program.command( "queue" )
    .description( "Process and execute fetches according to task queue" )
    .addOption( new Option( "-c, --count <tasks>", "only process a maximum of <count> queued tasks on this run" ).default( "100" ) )
    .action( async ( options ) => {
      const getTasks = prepareStatement<{ limit: number },Task>(
        await getPool(),
        "SELECT * FROM Tasks WHERE taskStatus = 'pending' LIMIT :limit"
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
      const getClub = prepareStatement<{ id: string },Club>(
        await getPool(),
        "SELECT * FROM Clubs WHERE clubId = :id"
      )
      const getClubSwimmers = prepareStatement<{ id: string },Swimmer>(
        await getPool(),
        "SELECT Swimmers.* FROM Swimmers INNER JOIN ClubSwimmers ON ( Swimmers.id = ClubSwimmers.swimmerIr ) WHERE ClubSwimmers.clubId = :id"
      )
      const tasks = await getTasks.all( { limit: options.count } )
      for ( const task of tasks ) {
        console.log( `Processing task ${task.taskId}` )
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
                  const taskOptions = task.taskOptions ? JSON.parse( task.taskOptions ) : null
                  if ( !taskOptions.updateType ) {
                    throw new Error( `Can't find update type in task ${task.taskId}` )
                  }
                  await taskStart.run( task )
                  await updateSwimmerData( swimmer, taskOptions.updateType, taskOptions.force ?? false )
                  await taskComplete.run( task )
                  break
                }
                case "club" : {
                  if ( !task.targetId ) {
                    throw new Error( `No target id on task ${task.taskId}` )
                  }
                  const club = await getClub.get( { id: task.targetId } )
                  if ( !club ) {
                    throw new Error( `Can't find club id '${task.targetId}' for task ${task.taskId}` )
                  }
                  const clubSwimmers = await getClubSwimmers.all( { id: task.targetId } )
                  if ( !club ) {
                    throw new Error( `Can't find club id '${task.targetId}' for task ${task.taskId}` )
                  }
                  const taskOptions = task.taskOptions ? JSON.parse( task.taskOptions ) : null
                  if ( !taskOptions.updateType ) {
                    throw new Error( `Can't find update type in task ${task.taskId}` )
                  }
                  await taskStart.run( task )
                  for ( const swimmer of clubSwimmers ) {
                    await updateSwimmerData( swimmer, taskOptions.updateType, taskOptions.force ?? false )
                  }
                  await taskComplete.run( task )
                  break
                }
                default : {
                  throw new Error( `Unexpected target type ${task.targetType} for task ${task.taskId}` )
                }
              }
              break
            }
            case "add" : {
              switch ( task.targetType ) {
                case "user" : {
                  if ( !task.targetId ) {
                    throw new Error( `No target id on task ${task.taskId}` )
                  }
                  const getUser = prepareStatement<{id: string}, User>( await getPool(), "SELECT * FROM User where id = :id" )
                  const user = await getUser.get( { id: task.targetId } )
                  if ( !user ) {
                    throw new Error ( `Invalid user id '${task.targetId}'` )
                  }

                  const taskOptions = task.taskOptions ? JSON.parse( task.taskOptions ) : null
                  if ( !taskOptions.club ) {
                    throw new Error ( `No club id found in options for task '${task.taskId}'` )
                  }
                  const club = await getClub.get( { id: taskOptions.club } )
                  if ( !club ) {
                    throw new Error( `Can't find club id '${taskOptions.club}' for task ${task.taskId}` )
                  }
                  await taskStart.run( task )
                  await addClubSwimmers( user, club )
                  await taskComplete.run( task )
                  break
                }
                default : {
                  throw new Error( `Unexpected target type ${task.targetType} for task ${task.taskId}` )
                }
              }
              break
            }
            default : {
              throw new Error( `Unexpected task type ${task.taskType} for task ${task.taskId}` )
            }
          }
        } catch ( e ) {
          console.error( "Unable to execute task", e )
          task.taskResult = JSON.stringify( e )
          await taskUpdateError.run( task )
        }
      }
    } )

  try {
    if ( process.env.NORDVPN_SC_USERNAME && process.env.NORDVPN_SC_PASSWORD ) {
      await setupNordFetch( {
        server: "nl.socks.nordhold.net",
        username: process.env.NORDVPN_SC_USERNAME!,
        password: process.env.NORDVPN_SC_PASSWORD!
      } )
    }
    await program.parseAsync( process.argv )
  } catch ( error ) {
    console.error( "Error in script", error )
  } finally {
    await closeBrowser()
    await closePool()
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
