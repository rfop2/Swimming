#!/usr/bin/env nodemjs
import "dotenv/config"
import * as Sentry from "@sentry/node"

Sentry.init( {
  dsn: "https://95f3d66ca3d941509f3dacbbf8b478fc@o149151.ingest.us.sentry.io/4511064670011392",
  tracesSampleRate: 1.0,
} )

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
  setGeocodeFetch,
  addNotification,
  REGIONS,
} from "lib"

import type {
  Club,
  ClubMeet,
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
) ON DUPLICATE KEY UPDATE
  time = :time,
  wa_pts = :wa_pts,
  round = :round,
  date = :date,
  meet = :meet,
  venue = :venue,
  club_swam_under = :club_swam_under,
  level = :level
;`

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

const updateMeetClub = "REPLACE INTO ClubMeets ( clubId, meetId ) VALUES ( :clubId, :meetId )"

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
    const saveResults = prepareStatement( conn, insertResultsSql )
    const deleteResults = prepareStatement<{swimmer: string, course: string, stroke: string, distance: string, maxSeq: number}>(
      conn,
      "DELETE FROM Results WHERE swimmer = :swimmer AND  `course` = :course AND `stroke` = :stroke AND `distance` = :distance AND `seq` > :maxSeq"
    )
    const responses = await fetchPages( pages, force ? 0 : undefined )
    for ( const [ url, { content } ] of responses.entries() ) {
    // console.log( inspect( pageData, { depth: 5 } ) )
      const page = pages.get( url )
      if ( !page )
        throw new Error( `Can't find page with url '${url}'` )
      const event = page.data as IndividualStats
      const $ = cheerio.load( content )

      const resultsData = parseResults( page as PageInfo, $ )

      let maxSeq = 0
      for ( const [ index, result ] of resultsData.entries() ) {
        maxSeq = index + 1
        await saveResults.run( { swimmer: swimmer.id, course: event.course, stroke: event.stroke, distance: event.distance, seq: maxSeq, ...result } )
      }
      await deleteResults.run( { swimmer: swimmer.id, course: event.course, stroke: event.stroke, distance: event.distance, maxSeq } )
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

const commonPrefixLength = ( a: string, b: string ): number => {
  const max = Math.min( a.length, b.length )
  let i = 0
  while ( i < max && a[i] === b[i] ) {
    i++
  }
  return i
}

type MatchResult =
  | { status: "unique"; club: Club; score: number }
  | { status: "ambiguous"; clubs: { club: Club; score: number }[] }
  | { status: "none" }

const MIN_MEET_MATCH_LENGTH = 5

const resolveClubMatch = (
  meet: Meet,
  clubs: Club[]
): MatchResult =>  {

  const meetName = meet.name?.replace( /^\d{4}\s+/, "" ) ?? ""

  let bestScore = 0
  const bestMatches: { club: Club; score: number }[] = []

  for ( const club of clubs ) {
    if ( meet.region !== `${REGIONS[club.clubRegion]} Region` )
      continue

    const meetScore = club.meetName
      ? commonPrefixLength( meetName, club.meetName )
      : 0

    const clubScore = club.clubName
      ? commonPrefixLength( meetName, club.clubName )
      : 0

    const score = Math.max( meetScore, clubScore )

    if ( score < MIN_MEET_MATCH_LENGTH ) continue

    if ( score > bestScore ) {
      bestScore = score
      bestMatches.length = 0
      bestMatches.push( { club, score } )
    } else if ( score === bestScore ) {
      bestMatches.push( { club, score } )
    }
  }

  if ( bestMatches.length === 0 ) {
    return { status: "none" }
  }

  if ( bestMatches.length === 1 ) {
    return {
      status: "unique",
      club: bestMatches[0].club,
      score: bestScore
    }
  }

  return {
    status: "ambiguous",
    clubs: bestMatches
  }
}

const updateMeets = async ( force: boolean ) => {
  console.log( "Updating meets" )

  const pool = await getPool()
  const selectClubs = prepareStatement<Record<string, never>,Club>( pool, "SELECT * FROM Clubs" )
  const clubs = await selectClubs.all()
  const selectMeets = prepareStatement<Record<string, never>,ClubMeet>( pool, "SELECT Meets.*, ClubMeets.clubId FROM Meets LEFT JOIN ClubMeets ON(Meets.id = ClubMeets.meetId) WHERE date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')" )
  const meets = await selectMeets.all()
  const meetsMap = new Map<ClubMeet["id"],ClubMeet>( meets.map( m => ( [ m.id, m ] ) ) )
  const fetchedMeets = new Set<Meet["id"]>()

  const region = "P"

  let pageNo = 1
  let numPages = 1
  const counts = {
    created: 0,
    updated: 0,
    deleted: 0,
  }
  const saveMeet = prepareStatement<Partial<Meet>>( pool, insertMeetsSql )
  const saveClubMeet = prepareStatement<{meetId:string, clubId:string}>( pool, updateMeetClub )
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
      let clubId: ClubMeet["clubId"] = undefined
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
          await saveMeet.run( meet )
        } catch ( error ) {
          console.error( `Unable to update meet '${meet.name}'`, error )
        }
      }

      if ( dbMeet && !dbMeet.clubId ) {
        const clubMatch = resolveClubMatch( meet as Meet, clubs )
        if ( clubMatch.status === "unique" ) {
          clubId = clubMatch.club.clubId
          console.warn( `Assigned meet '${meet.name} to club '${clubMatch.club.clubName}'` )
        } else if ( clubMatch.status === "ambiguous" ) {
          console.warn( `Multiple club meet matches for '${meet.name}`, clubMatch.clubs )
        } else {
          console.log( `No club matches for '${meet.name}` )
        }
        if ( clubId && ( !dbMeet || dbMeet?.clubId !== clubId ) ) {
          try {
            await saveClubMeet.run( { meetId: meet.id, clubId } )
          } catch ( error ) {
            console.error( `Unable to update club id '${clubId}' for meet '${meet.name}'`, error )
          }
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
  const selectLastResultsUpdate = prepareStatement<Record<string, never>,{value: string}>( pool, "SELECT value FROM System WHERE name = 'lastResultsUpdate'" )
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
    const getSystemUser = prepareStatement( conn, "SELECT * FROM User WHERE role = 'system'" )
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
        taskDescription: `Triggered rankings update of swimmer ${swimmerId} from meet results`,
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
  const bypassLock = process.argv.includes( "--no-lock" )
  if ( !bypassLock ) {
    await acquireLock()
  }

  const program = new Command()

  program
    .name( "fetch" )
    .description( "Fetch and update data from source site" )
    .addOption( new Option( "--no-lock", "bypass the lock file check (allows running alongside other fetch processes)" ) )

  program.showHelpAfterError()

  program.command( "swimmers" )
    .description( "Fetch swimmer data" )
    .option( "-i, --id <ids...>", "fetch data for specified swimmers" )
    .option( "-c, --club <club>", "fetch data for swimmers in specified club only" )
    .addOption( new Option( "-u, --update <update>", "what level of swimmer data to update" ).choices( [ "individual", "results", "rankings" ] ) )
    .addOption( new Option( "-m, --mode <mode>", "fetching strategy versus caching" ).choices( [ "force", "smart", "lazy" ] ).default( "lazy" ) )
    .action( async ( options ) => {
      const getSwimmers = prepareStatement<Record<string, never>,Swimmer>(
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
      const pool = await getPool()
      const getSystemUser = prepareStatement( pool, "SELECT * FROM User WHERE role = 'system'" )
      const systemUser = await getSystemUser.get()
      if ( !systemUser ) {
        throw new Error( "Can't find system user in database" )
      }
      try {
        await updateMeets( options.mode === "force" )
        await addNotification( pool, systemUser.id, "admin", "success", "Meets listings have been updated" )
      } catch ( e ) {
        console.error( "Unable to update meets", e )
        await addNotification( pool, systemUser.id, "admin", "error", "Meets listings were not able to be updated" )
      }
    } )

  program.command( "queue" )
    .description( "Process and execute fetches according to task queue" )
    .addOption( new Option( "-c, --count <tasks>", "only process a maximum of <count> queued tasks on this run" ).default( "100" ) )
    .action( async ( options ) => {
      const pool = await getPool()
      const getSystemUser = prepareStatement( pool, "SELECT * FROM User WHERE role = 'system'" )
      const systemUser = await getSystemUser.get()
      if ( !systemUser ) {
        throw new Error( "Can't find system user in database" )
      }
      const getTasks = prepareStatement<{ limit: number },Task>(
        pool,
        "SELECT * FROM Tasks WHERE taskStatus = 'pending' LIMIT :limit"
      )
      const taskStart = prepareStatement(
        pool,
        "UPDATE Tasks SET startTime = NOW(), taskStatus = 'progress', taskResult = '' WHERE taskId = :taskId",
      )
      const taskComplete = prepareStatement(
        pool,
        "UPDATE Tasks SET endTime = NOW(), taskStatus = 'complete' WHERE taskId = :taskId",
      )
      const taskUpdateError = prepareStatement(
        pool,
        "UPDATE Tasks SET endTime = NOW(), taskStatus = 'error', taskResult = :taskResult WHERE taskId = :taskId",
      )
      const getSwimmer = prepareStatement<{ id: string },Swimmer>(
        pool,
        "SELECT * FROM Swimmers WHERE id = :id"
      )
      const getClub = prepareStatement<{ id: string },Club>(
        pool,
        "SELECT * FROM Clubs WHERE clubId = :id"
      )
      const getClubSwimmers = prepareStatement<{ id: string },Swimmer>(
        pool,
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
                  await addNotification( pool, systemUser.id, task.creatorId ?? "", "success", `Task: ${task.taskDescription} has completed` )
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
                  await addNotification( pool, systemUser.id, task.creatorId ?? "", "success", `Task: ${task.taskDescription} has completed` )
                  await taskComplete.run( task )
                  break
                }
                default : {
                  await addNotification( pool, systemUser.id, task.creatorId ?? "", "error", `Task: ${task.taskDescription} has unexpected target '${task.targetType}'` )
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
                  await addNotification( pool, systemUser.id, task.creatorId ?? "", "error", `Task: ${task.taskDescription} has unexpected target '${task.targetType}'` )
                  throw new Error( `Unexpected target type ${task.targetType} for task ${task.taskId}` )
                }
              }
              break
            }
            default : {
              await addNotification( pool, systemUser.id, task.creatorId ?? "", "error", `Task: ${task.taskDescription} has unexpected type '${task.taskType}'` )
              throw new Error( `Unexpected task type ${task.taskType} for task ${task.taskId}` )
            }
          }
        } catch ( e ) {
          console.error( "Unable to execute task", e )
          await addNotification( pool, systemUser.id, task.creatorId ?? "", "error", `Task: ${task.taskDescription} was not able to be run` )
          task.taskResult = JSON.stringify( e )
          await taskUpdateError.run( task )
        }
      }
    } )

  interface PoolFinderPool {
    id: number
    name: string
    lat: number
    lon: number
    url: string
    street: string
    town: string
    country: string
    postcode: string
  }

  // Centers chosen so the 200-pool radius from each overlaps adjacent zones.
  // Spacing: London ~8 mi (4×5 grid), Midlands ~25 mi, North ~30 mi, Scotland ~50 mi.
  const FINDER_LOCATIONS = [
    // London — 4 rows × 5 cols, ~8 mi spacing (0.11 lat / 0.18 lon).
    // Finer than rest of UK because club/pool density is much higher here;
    // the clubs API 500s if >~100 results are returned in one request.
    { name: "london-r1c1", lat: 51.30, lon: -0.51 },
    { name: "london-r1c2", lat: 51.30, lon: -0.33 },
    { name: "london-r1c3", lat: 51.30, lon: -0.13 },
    { name: "london-r1c4", lat: 51.30, lon:  0.05 },
    { name: "london-r1c5", lat: 51.30, lon:  0.23 },
    { name: "london-r2c1", lat: 51.41, lon: -0.51 },
    { name: "london-r2c2", lat: 51.41, lon: -0.33 },
    { name: "london-r2c3", lat: 51.41, lon: -0.13 },
    { name: "london-r2c4", lat: 51.41, lon:  0.05 },
    { name: "london-r2c5", lat: 51.41, lon:  0.23 },
    { name: "london-r3c1", lat: 51.52, lon: -0.51 },
    { name: "london-r3c2", lat: 51.52, lon: -0.33 },
    { name: "london-r3c3", lat: 51.52, lon: -0.13 },
    { name: "london-r3c4", lat: 51.52, lon:  0.05 },
    { name: "london-r3c5", lat: 51.52, lon:  0.23 },
    { name: "london-r4c1", lat: 51.62, lon: -0.51 },
    { name: "london-r4c2", lat: 51.62, lon: -0.33 },
    { name: "london-r4c3", lat: 51.62, lon: -0.13 },
    { name: "london-r4c4", lat: 51.62, lon:  0.05 },
    { name: "london-r4c5", lat: 51.62, lon:  0.23 },
    // South East England
    { name: "brighton",        lat: 50.827, lon: -0.137 },
    { name: "crawley",         lat: 51.109, lon: -0.187 },
    { name: "guildford",       lat: 51.236, lon: -0.570 },
    { name: "maidstone",       lat: 51.271, lon:  0.529 },
    { name: "canterbury",      lat: 51.281, lon:  1.080 },
    { name: "hastings",        lat: 50.854, lon:  0.573 },
    { name: "bognor",          lat: 50.787, lon: -0.677 },
    { name: "southampton",     lat: 50.909, lon: -1.404 },
    { name: "portsmouth",      lat: 50.820, lon: -1.088 },
    { name: "winchester",      lat: 51.063, lon: -1.308 },
    { name: "reading",         lat: 51.455, lon: -0.971 },
    { name: "oxford",          lat: 51.752, lon: -1.257 },
    { name: "slough",          lat: 51.510, lon: -0.595 },
    { name: "basingstoke",     lat: 51.264, lon: -1.088 },
    { name: "colchester",      lat: 51.896, lon:  0.898 },
    { name: "chelmsford",      lat: 51.736, lon:  0.474 },
    // South West England
    { name: "bristol",         lat: 51.455, lon: -2.588 },
    { name: "bath",            lat: 51.381, lon: -2.360 },
    { name: "swindon",         lat: 51.558, lon: -1.782 },
    { name: "gloucester",      lat: 51.864, lon: -2.238 },
    { name: "cheltenham",      lat: 51.900, lon: -2.078 },
    { name: "bournemouth",     lat: 50.720, lon: -1.877 },
    { name: "salisbury",       lat: 51.069, lon: -1.795 },
    { name: "dorchester",      lat: 50.714, lon: -2.438 },
    { name: "exeter",          lat: 50.726, lon: -3.527 },
    { name: "plymouth",        lat: 50.376, lon: -4.143 },
    { name: "taunton",         lat: 51.015, lon: -3.101 },
    { name: "truro",           lat: 50.263, lon: -5.051 },
    { name: "barnstaple",      lat: 51.080, lon: -4.058 },
    // East England
    { name: "cambridge",       lat: 52.205, lon:  0.119 },
    { name: "peterborough",    lat: 52.574, lon: -0.241 },
    { name: "norwich",         lat: 52.628, lon:  1.298 },
    { name: "ipswich",         lat: 52.059, lon:  1.155 },
    { name: "luton",           lat: 51.879, lon: -0.420 },
    { name: "bedford",         lat: 52.136, lon: -0.466 },
    { name: "kingslynn",       lat: 52.752, lon:  0.399 },
    { name: "northampton",     lat: 52.237, lon: -0.895 },
    // East Midlands
    { name: "nottingham",      lat: 52.954, lon: -1.158 },
    { name: "leicester",       lat: 52.636, lon: -1.133 },
    { name: "derby",           lat: 52.922, lon: -1.477 },
    { name: "lincoln",         lat: 53.234, lon: -0.540 },
    { name: "mansfield",       lat: 53.146, lon: -1.196 },
    // West Midlands
    { name: "birmingham",      lat: 52.480, lon: -1.902 },
    { name: "walsall",         lat: 52.586, lon: -1.980 },
    { name: "coventry",        lat: 52.408, lon: -1.510 },
    { name: "wolverhampton",   lat: 52.586, lon: -2.128 },
    { name: "worcester",       lat: 52.192, lon: -2.221 },
    { name: "stoke",           lat: 53.002, lon: -2.180 },
    { name: "telford",         lat: 52.678, lon: -2.445 },
    { name: "hereford",        lat: 52.054, lon: -2.716 },
    { name: "redditch",        lat: 52.306, lon: -1.944 },
    // Yorkshire
    { name: "leeds",           lat: 53.800, lon: -1.549 },
    { name: "sheffield",       lat: 53.383, lon: -1.466 },
    { name: "bradford",        lat: 53.796, lon: -1.759 },
    { name: "york",            lat: 53.959, lon: -1.082 },
    { name: "hull",            lat: 53.744, lon:  0.336 },
    { name: "doncaster",       lat: 53.523, lon: -1.128 },
    { name: "harrogate",       lat: 54.000, lon: -1.540 },
    { name: "scarborough",     lat: 54.281, lon: -0.403 },
    { name: "wakefield",       lat: 53.683, lon: -1.506 },
    // North West England
    { name: "manchester",      lat: 53.480, lon: -2.243 },
    { name: "liverpool",       lat: 53.408, lon: -2.991 },
    { name: "warrington",      lat: 53.390, lon: -2.597 },
    { name: "preston",         lat: 53.763, lon: -2.703 },
    { name: "blackpool",       lat: 53.817, lon: -3.036 },
    { name: "chester",         lat: 53.193, lon: -2.893 },
    { name: "wigan",           lat: 53.543, lon: -2.631 },
    { name: "blackburn",       lat: 53.748, lon: -2.482 },
    { name: "bolton",          lat: 53.578, lon: -2.430 },
    { name: "lancaster",       lat: 54.047, lon: -2.800 },
    { name: "barrow",          lat: 54.113, lon: -3.228 },
    // North East England
    { name: "newcastle",       lat: 54.978, lon: -1.618 },
    { name: "sunderland",      lat: 54.906, lon: -1.381 },
    { name: "middlesbrough",   lat: 54.574, lon: -1.235 },
    { name: "darlington",      lat: 54.524, lon: -1.559 },
    { name: "carlisle",        lat: 54.895, lon: -2.934 },
    { name: "durham",          lat: 54.778, lon: -1.577 },
    // Wales
    { name: "cardiff",         lat: 51.483, lon: -3.177 },
    { name: "swansea",         lat: 51.621, lon: -3.944 },
    { name: "newport",         lat: 51.588, lon: -2.998 },
    { name: "wrexham",         lat: 53.043, lon: -2.993 },
    { name: "bangor-wales",    lat: 53.228, lon: -4.128 },
    { name: "aberystwyth",     lat: 52.415, lon: -4.083 },
    { name: "llandudno",       lat: 53.324, lon: -3.827 },
    { name: "carmarthen",      lat: 51.857, lon: -4.312 },
    { name: "brecon",          lat: 51.945, lon: -3.387 },
    { name: "pontypridd",      lat: 51.603, lon: -3.343 },
    // Scotland
    { name: "glasgow",         lat: 55.864, lon: -4.252 },
    { name: "edinburgh",       lat: 55.953, lon: -3.188 },
    { name: "aberdeen",        lat: 57.149, lon: -2.094 },
    { name: "dundee",          lat: 56.462, lon: -2.971 },
    { name: "perth",           lat: 56.396, lon: -3.437 },
    { name: "stirling",        lat: 56.117, lon: -3.937 },
    { name: "inverness",       lat: 57.477, lon: -4.224 },
    { name: "fortwilliam",     lat: 56.820, lon: -5.105 },
    { name: "ayr",             lat: 55.459, lon: -4.629 },
    { name: "dumfries",        lat: 55.071, lon: -3.605 },
    { name: "wick",            lat: 58.440, lon: -3.096 },
    { name: "stornoway",       lat: 58.210, lon: -6.386 },
    // Northern Ireland — 130-mile radius covers the whole region from Belfast
    { name: "belfast",         lat: 54.597, lon: -5.930 },
    { name: "derry",           lat: 54.997, lon: -7.309 },
  ]

  const parsePoolsFromHtml = ( html: string, centerName: string ): PoolFinderPool[] => {
    const $ = cheerio.load( html )
    const pools: PoolFinderPool[] = []
    $( "li.results-item" ).each( ( _, el ) => {
      const lat = parseFloat( $( el ).attr( "data-lat" ) ?? "" )
      const lon = parseFloat( $( el ).attr( "data-long" ) ?? "" )
      const anchor = $( el ).find( ".item-title a" )
      const href = anchor.attr( "href" ) ?? ""
      const name = anchor.text().trim()
      const idMatch = href.match( /\/pools\/(\d+)\// )
      if ( !idMatch ) return
      const id = parseInt( idMatch[1], 10 )

      const rawAddr = $( el ).find( ".item-address" ).text()
      const parts = rawAddr.split( "," ).map( s => s.replace( /\s+/g, " " ).trim() ).filter( Boolean )
      // Format: street parts..., town, country, postcode
      const postcode = parts.at( -1 )?.match( /^[A-Z]{1,2}\d/ ) ? ( parts.pop() ?? "" ) : ""
      const country = parts.at( -1 ) ?? ""
      if ( country === "England" || country === "Scotland" || country === "Wales" || country === "Northern Ireland" ) {
        parts.pop()
      }
      const town = parts.pop() ?? ""
      const street = parts.join( ", " )

      pools.push( { id, name, lat, lon, url: href, street, town, country, postcode } )
    } )
    if ( pools.length === 0 && html.includes( "results-item" ) ) {
      console.warn( `  Warning: found results-item in HTML but parsed 0 pools for ${centerName}` )
    }
    return pools
  }

  const upsertSwimmingPoolSql =
    `INSERT INTO SwimmingPools (id, name, street, town, country, postcode, lat, lon, url)
    VALUES (:id, :name, :street, :town, :country, :postcode, :lat, :lon, :url)
    ON DUPLICATE KEY UPDATE
      name     = :name,
      street   = :street,
      town     = :town,
      country  = :country,
      postcode = :postcode,
      lat      = :lat,
      lon      = :lon,
      url      = :url`

  program.command( "pools" )
    .description( "Fetch all UK swimming pools from swimming.org/poolfinder and save to SwimmingPools table" )
    .addOption( new Option( "-m, --mode <mode>", "fetching strategy versus caching" ).choices( [ "force", "lazy" ] ).default( "lazy" ) )
    .action( async ( options ) => {
      const force = options.mode === "force"
      const allPools = new Map<number, PoolFinderPool>()
      const poolfinder = new URL( "https://www.swimming.org/poolfinder/" )

      for ( const loc of FINDER_LOCATIONS ) {
        const searchUrl = new URL( poolfinder.toString() + "search" )
        searchUrl.searchParams.set( "page", "10" )
        searchUrl.searchParams.set( "per_page", "20" )
        searchUrl.searchParams.set( "location", loc.name )
        searchUrl.searchParams.set( "latitude", String( loc.lat ) )
        searchUrl.searchParams.set( "longitude", String( loc.lon ) )

        const pageInfo = {
          label: `pools_${loc.name}`,
          url: searchUrl,
          type: "pools" as const,
          referrer: poolfinder,
        }

        let content: string
        try {
          const result = await fetchPage( pageInfo, force ? 0 : undefined )
          content = result.content as string
        } catch ( e ) {
          console.error( `  Skipping ${loc.name}: ${e}` )
          continue
        }

        const pools = parsePoolsFromHtml( content, loc.name )
        let newCount = 0
        for ( const pool of pools ) {
          if ( !allPools.has( pool.id ) ) {
            allPools.set( pool.id, pool )
            newCount++
          }
        }
        console.log( `  ${loc.name}: ${pools.length} pools fetched, ${newCount} new — total ${allPools.size}` )
      }

      const upsertPool = prepareStatement( await getPool(), upsertSwimmingPoolSql )
      let saved = 0
      for ( const pool of allPools.values() ) {
        await upsertPool.run( pool )
        saved++
      }
      console.log( `\nSaved ${saved} pools to SwimmingPools` )
    } )

  interface ClubFinderClub {
    id: number
    name: string
    lat: number
    lon: number
    url: string
    street: string
    town: string
    county: string
    country: string
    postcode: string
    primaryPoolId: number | null
  }

  const parseClubsFromHtml = ( html: string, centerName: string ): ClubFinderClub[] => {
    const $ = cheerio.load( html )
    const clubs: ClubFinderClub[] = []
    $( "li.results-item" ).each( ( _, el ) => {
      const lat = parseFloat( $( el ).attr( "data-lat" ) ?? "" )
      const lon = parseFloat( $( el ).attr( "data-long" ) ?? "" )
      const anchor = $( el ).find( ".item-title a" )
      const href = anchor.attr( "href" ) ?? ""
      const name = anchor.text().trim()
      const idMatch = href.match( /\/clubs\/(\d+)(?:\/(\d+))?/ )
      if ( !idMatch ) return
      const id = parseInt( idMatch[1], 10 )
      const primaryPoolId = idMatch[2] ? parseInt( idMatch[2], 10 ) : null

      const rawAddr = $( el ).find( ".item-address" ).text()
      const parts = rawAddr.split( "," ).map( s => s.replace( /\s+/g, " " ).trim() ).filter( Boolean )
      // Format: street parts..., town, county, country, postcode
      const postcode = parts.at( -1 )?.match( /^[A-Z]{1,2}\d/ ) ? ( parts.pop() ?? "" ) : ""
      const country = parts.at( -1 ) ?? ""
      if ( country === "England" || country === "Scotland" || country === "Wales" || country === "Northern Ireland" ) {
        parts.pop()
      }
      const county = parts.pop() ?? ""
      const town = parts.pop() ?? ""
      const street = parts.join( ", " )

      clubs.push( { id, name, lat, lon, url: href, street, town, county, country, postcode, primaryPoolId } )
    } )
    if ( clubs.length === 0 && html.includes( "results-item" ) ) {
      console.warn( `  Warning: found results-item in HTML but parsed 0 clubs for ${centerName}` )
    }
    return clubs
  }

  const upsertSwimmingClubSql =
    `INSERT INTO SwimmingClubs (id, name, street, town, county, country, postcode, lat, lon, url, primaryPoolId)
    VALUES (:id, :name, :street, :town, :county, :country, :postcode, :lat, :lon, :url, :primaryPoolId)
    ON DUPLICATE KEY UPDATE
      name          = :name,
      street        = :street,
      town          = :town,
      county        = :county,
      country       = :country,
      postcode      = :postcode,
      lat           = :lat,
      lon           = :lon,
      url           = :url,
      primaryPoolId = :primaryPoolId`

  const CLUBS_PAGE = 12
  const CLUBS_PER_PAGE = 10

  program.command( "clubs" )
    .description( "Fetch all UK swimming clubs from swimming.org/clubfinder and save to SwimmingClubs table" )
    .addOption( new Option( "-m, --mode <mode>", "fetching strategy versus caching" ).choices( [ "force", "lazy" ] ).default( "lazy" ) )
    .action( async ( options ) => {
      const force = options.mode === "force"
      const allClubs = new Map<number, ClubFinderClub>()
      const clubfinder = new URL( "https://www.swimming.org/poolfinder/clubs/" )

      for ( const loc of FINDER_LOCATIONS ) {
        const searchUrl = new URL( clubfinder.toString() + "search" )
        searchUrl.searchParams.set( "page", String( CLUBS_PAGE ) )
        searchUrl.searchParams.set( "per_page", String( CLUBS_PER_PAGE ) )
        searchUrl.searchParams.set( "location", loc.name )
        searchUrl.searchParams.set( "latitude", String( loc.lat ) )
        searchUrl.searchParams.set( "longitude", String( loc.lon ) )
        searchUrl.searchParams.set( "filter[discipline_swimming]", "true" )
        // searchUrl.searchParams.set( "filter[discipline_master]", "true" )

        const pageInfo = {
          label: `clubs_${loc.name}`,
          url: searchUrl,
          type: "clubs" as const,
          referrer: clubfinder,
        }

        let content: string
        try {
          const result = await fetchPage( pageInfo, force ? 0 : undefined )
          content = result.content as string
        } catch ( e ) {
          console.error( `  Skipping ${loc.name}: ${e}` )
          continue
        }

        const clubs = parseClubsFromHtml( content, loc.name )
        let newCount = 0
        const uniqueInBatch = new Set<number>()
        for ( const club of clubs ) {
          uniqueInBatch.add( club.id )
          if ( !allClubs.has( club.id ) ) {
            allClubs.set( club.id, club )
            newCount++
          }
        }
        if ( uniqueInBatch.size >= CLUBS_PAGE * CLUBS_PER_PAGE ) {
          console.warn( `  Warning: ${loc.name} returned ${uniqueInBatch.size} clubs (cap hit — densify grid here)` )
        }
        console.log( `  ${loc.name}: ${uniqueInBatch.size} clubs, ${newCount} new — total ${allClubs.size}` )
      }

      const upsertClub = prepareStatement( await getPool(), upsertSwimmingClubSql )
      let saved = 0
      for ( const club of allClubs.values() ) {
        await upsertClub.run( club )
        saved++
      }
      console.log( `\nSaved ${saved} clubs to SwimmingClubs` )
    } )

  try {
    // Capture native fetch before NordVPN patches globalThis.fetch, so geocoding
    // goes via the real IP rather than a shared VPN exit node (which Nominatim blocks).
    setGeocodeFetch( globalThis.fetch )
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
    Sentry.captureException( error )
  } finally {
    await closeBrowser()
    await closePool()
    await Sentry.flush( 2000 )
  }
} )().catch( async ( error ) => {
  console.error( "Uncaught error...", error )
  Sentry.captureException( error )
  await Sentry.flush( 2000 )
} )

process.on( "unhandledRejection", ( reason, promise ) => {
  console.error( "Unhandled rejection in promise:", reason, promise )
  Sentry.captureException( reason )
} )

process.on( "uncaughtException", ( err ) => {
  console.error( "Uncaught exception:", err )
  Sentry.captureException( err )
} )
