#!/usr/bin/env nodemjs
import "dotenv/config"
import * as cheerio from "cheerio"
import type { Club, PageInfo } from "lib"
import { COUNTIES, createUrl, fetchPage, getPool, isMySql2Error, NATIONALITIES, parseRanking, prepareStatement, rankBaseUrl, REGIONS, runTransaction, STROKE_DISTANCE } from "lib"

( async () => {
  const args = process.argv.slice( 2 )

  if ( args.length < 2 ) {
    throw( "Error, username, club must be given. Country, region and county may also be provided" )
  }

  const username = args[0]
  let clubCode = args[1]
  const country = args[2]
  const region = args[3]
  const county = args[4]

  // https://www.swimmingresults.org/12months/last12.php?Pool=S&Stroke=1&Sex=F&AgeGroup=OP&StartNumber=1&RecordsToView=100&TargetNationality=P&TargetRegion=P&TargetCounty=XXXX&Level=O&TargetClub=CHIWWLTW
  // https://www.swimmingresults.org/12months/index.php?Pool=S&Stroke=1&Sex=F&AgeGroup=OP&date-1-dd=&date-1-mm=&date-1=&StartNumber=1&RecordsToView=100&Level=O&TargetNationality=P&TargetRegion=P&TargetCounty=XXXX&TargetClub=CHIWWLTW
  // https://www.swimmingresults.org/12months/last12.php?Pool=S&Stroke=1&Sex=F&AgeGroup=OP&StartNumber=10&RecordsToView=100&TargetNationality=P&TargetRegion=P&TargetCounty=XXXX&Level=O&TargetClub=CHIWWLTW

  const getUser = prepareStatement( await getPool(), "SELECT * FROM User where username = :username" )
  const user = await getUser.get( { username } )
  if ( !user ) {
    throw new Error ( `Invalid user '${username}'` )
  }

  let club = null
  let clubId = null
  let countryCode = null
  let regionCode = null
  let countyCode = null
  if ( clubCode.match( /^[A-Z]{4,8}$/ ) ) {
    clubId = clubCode.substring( 0, 4 )
    const getClub = prepareStatement<{clubId:string},Club>( await getPool(), "SELECT * FROM Clubs where clubId = :clubId" )
    club = await getClub.get( { clubId: clubCode } )
    if ( !club ) {
      throw new Error ( `Can't find club code '${clubCode}'` )
    }
  } else {
    const getClub = prepareStatement<{clubName:string},Club>( await getPool(), "SELECT * FROM Clubs where clubName = :clubName" )
    club = await getClub.get( { clubName: clubCode } )
    if ( !club ) {
      throw new Error ( `Can't find club name '${clubCode}'` )
    }
  }
  clubId = club.clubId
  clubCode = `${clubId}${club.clubCounty}`
  countyCode = club.clubCounty
  regionCode = club.clubRegion
  // countryCode = regionCode === "X" ? "S" : ( regionCode === "Y" ? "W" : "E" )

  if ( !countryCode && country ) {
    const countryLookup = Object.fromEntries( Object.entries( NATIONALITIES ).map( ( [ k, v ] ) => [ v, k ] ) )
    countryCode = countryLookup[country]
    if ( !countryCode ) {
      throw new Error ( `Can't find region '${country}'` )
    }
  }
  if ( !countryCode ) {
    countryCode = "E"
  }

  if ( !regionCode && region ) {
    const regionLookup = Object.fromEntries( Object.entries( REGIONS ).map( ( [ k, v ] ) => [ v, k ] ) )
    regionCode = regionLookup[region]
    if ( !regionCode ) {
      throw new Error ( `Can't find region '${region}'` )
    }
  }

  if ( !countyCode && county ) {
    const countyLookup = Object.fromEntries( Object.entries( COUNTIES ).map( ( [ k, v ] ) => [ v, k ] ) )
    countyCode = countyLookup[county]
    if ( !countyCode ) {
      throw new Error ( `Can't find county '${county}'` )
    }
  }

  const insertSwimmerSql =
    `INSERT IGNORE INTO Swimmers (
  id,
  firstName,
  lastName,
  birthday,
  gender,
  nationality,
  region,
  county,
  active
)
VALUES (
  :id,
  :firstName,
  :lastName,
  :birthday,
  :gender,
  :nationality,
  :region,
  :county,
  :active
)
ON DUPLICATE KEY UPDATE
  firstName   = :firstName,
  lastName    = :lastName,
  birthday    = :birthday,
  gender      = :gender,
  nationality = :nationality,
  region      = :region,
  county      = :county,
  active      = :active
;`

  const insertUserSwimmerSql =
    `INSERT IGNORE INTO UserSwimmers (
  userId,
  swimmerId
)
VALUES (
  :userId,
  :swimmerId
);`

  const insertClubSwimmerSql =
    `INSERT IGNORE INTO ClubSwimmers (
  clubId,
  swimmerId,
  rankedClub
)
VALUES (
  :clubId,
  :swimmerId,
  :rankedClub
);`

  const getRankedClub = prepareStatement<{clubAlias:string},Club>( await getPool(), "SELECT * FROM Clubs where clubAlias = :clubAlias OR clubName = :clubAlias" )

  try {
    const ageGroup = "OP"
    for ( const gender of [ "M", "F" ] ) {
      for ( const course of [ "S", "L" ] ) {
        for ( const [ strokeDistance, sdCode ] of Object.entries( STROKE_DISTANCE ) ) {
          const matches = strokeDistance.toLocaleLowerCase().match( /(?<stroke>\w+)__(?<distance>\d+m)$/ )
          if ( !matches ) {
            throw new Error( `Can't match stroke/distance on '${strokeDistance}'` )
          }
          const { stroke = "", distance = "" } = { ...matches?.groups }

          let morePages = false
          let pageNo = 1
          do {
            const page: PageInfo = {
              label: `${distance}_${stroke}_${gender.toLocaleLowerCase()}_${course === "S" ? "sc" : "lc"}_${ageGroup.toLocaleLowerCase()}_club_${clubCode.toLocaleLowerCase()}-${pageNo}`,
              url: createUrl( rankBaseUrl, {
                Stroke: sdCode,
                Pool: course,
                Sex: gender,
                AgeGroup: ageGroup,
                StartNumber: String( 1 + ( ( pageNo - 1 ) * 100 ) ),
                RecordsToView: "100",
                TargetNationality: "P",
                TargetRegion: "P",
                TargetCounty: "XXXX",
                TargetClub: clubCode,
                Level: "O",
              } ),
              type: "ranking",
            }

            const content = await fetchPage( page )

            // console.log( inspect( pageData, { depth: 5 } ) )
            const $ = cheerio.load( content )

            const rankingData = parseRanking( page, $ )

            await runTransaction( await getPool(), async ( conn ) => {
              const insertSwimmer = prepareStatement( conn, insertSwimmerSql )
              const insertUserSwimmer = prepareStatement( conn, insertUserSwimmerSql )
              const insertClubSwimmer = prepareStatement( conn, insertClubSwimmerSql )
              for ( const row of rankingData.table ) {
                const [ firstName, lastName ] = row.name.split( /\s+/ )
                const swimmer = {
                  id: row.swimmer,
                  firstName,
                  lastName,
                  birthday: Number( row.yob ) > 20 ? `${String( 1900 + Number( row.yob ) )}-06-01` : `${String( 2000 + Number( row.yob ) )}-06-01`,
                  gender: gender === "M" ? "male" : "female",
                  nationality: countryCode,
                  region: regionCode,
                  county: countyCode,
                  active: 1
                }
                await insertSwimmer.run( swimmer )
                await insertUserSwimmer.run( { userId: user.id, swimmerId: row.swimmer } )
                let ranked = true
                if ( row.ranked_club !== club.clubName && row.ranked_club !== club.clubAlias ) {
                // The swimmer's ranked club is not the club we are importing
                  const rankedClub = await getRankedClub.get( { clubAlias: row.ranked_club } )
                  if ( !rankedClub ) {
                    console.warn( `Can't find ranked club '${row.ranked_club}'` )
                  // throw new Error ( `Can't find ranked club '${row.ranked_club}'` )
                  } else {
                    await insertClubSwimmer.run( { clubId: rankedClub.clubId, swimmerId: row.swimmer, rankedClub: Number( ranked ) } )
                  }
                  ranked = false
                }
                await insertClubSwimmer.run( { clubId, swimmerId: row.swimmer, rankedClub: Number( ranked ) } )
              }
            }  )
            morePages = ( rankingData.table.length === 100 )
            pageNo++
          } while( morePages )
        }
      }
    }
  } catch ( e ) {
    if ( isMySql2Error( e ) ) {
      if ( e.code === "ER_DUP_ENTRY" ) {
        throw new Error( "Duplicate key error" )
      } else {
        throw new Error( `Database error: ${e.sqlMessage}` )
      }
    }
    throw e
  }
  console.log( "Club import completed" )
  process.exit( 0 )

} )().catch( ( error ) => {
  console.error( "Caught error...", error )
  console.trace( error )
  process.exit( -1 )
} )
