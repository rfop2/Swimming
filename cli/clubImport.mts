#!/usr/bin/env nodemjs
import "dotenv/config"
import * as cheerio from "cheerio"
import { COUNTIES, createUrl, fetchPage, getPool, isMySql2Error, NATIONALITIES, PageInfo, parseRanking, prepareStatement, rankBaseUrl, REGIONS, runTransaction, STROKE_DISTANCE } from "lib"

( async () => {
  const args = process.argv.slice( 2 )

  if ( args.length != 5 ) {
    throw( "Error, username, club, country, region and county must be given" )
  }

  const username = args[0]
  const clubCode = args[1]
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

  const countryLookup = Object.fromEntries( Object.entries( NATIONALITIES ).map( ( [ k, v ] ) => [ v, k ] ) )
  const countryCode = countryLookup[country]
  if ( !countryCode ) {
    throw new Error ( `Can't find region '${country}'` )
  }

  const regionLookup = Object.fromEntries( Object.entries( REGIONS ).map( ( [ k, v ] ) => [ v, k ] ) )
  const regionCode = regionLookup[region]
  if ( !regionCode ) {
    throw new Error ( `Can't find region '${region}'` )
  }

  const countyLookup = Object.fromEntries( Object.entries( COUNTIES ).map( ( [ k, v ] ) => [ v, k ] ) )
  const countyCode = countyLookup[county]
  if ( !countyCode ) {
    throw new Error ( `Can't find county '${county}'` )
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
  swimmerId
)
VALUES (
  :clubId,
  :swimmerId
);`

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

          const page: PageInfo = {
            label: `${distance}_${stroke}_${gender.toLocaleLowerCase()}_${course === "S" ? "sc" : "lc"}_${ageGroup.toLocaleLowerCase()}_club_${clubCode.toLocaleLowerCase()}`,
            url: createUrl( rankBaseUrl, {
              Stroke: sdCode,
              Pool: course,
              Sex: gender,
              AgeGroup: ageGroup,
              StartNumber: "1",
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
            const clubId = clubCode.substring( 0, 4 )
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
              await insertClubSwimmer.run( { clubId, swimmerId: row.swimmer } )
            }
          }  )
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
    throw new Error( "An unknown error occurred" )
  }
  console.log( "Club import completed" )
  process.exit( 0 )

} )().catch( ( error ) => {
  console.error( "Caught error...", error )
  console.trace( error )
  process.exit( -1 )
} )
