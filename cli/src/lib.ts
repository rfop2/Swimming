import * as cheerio from "cheerio"
import type { Club, PageInfo } from "lib"
import { COUNTIES, createUrl, fetchPage, getPool, isMySql2Error, NATIONALITIES, parseRanking, prepareStatement, rankBaseUrl, REGIONS, runTransaction, STROKE_DISTANCE } from "lib"
import type { User } from "lucia"

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

export const addClubSwimmers = async ( user: User, clubOrCode: string | Club, country?: string, region?: string, county?: string ) => {
  let club = null
  let countryCode = null
  let regionCode = null
  let countyCode = null

  if ( typeof clubOrCode === "string" ) {
    const clubCode = clubOrCode
    // Validate the supplied club
    if ( clubCode.match( /^[A-Z]{4,8}$/ ) ) {
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
  } else {
    club = clubOrCode
  }

  const clubId = club.clubId
  const clubCode = `${clubId}${club.clubCounty}`
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
              label: `${distance}_${stroke}_${gender.toLocaleLowerCase()}_${course === "S" ? "sc" : "lc"}_${ageGroup.toLocaleLowerCase()}_club_${clubId.toLocaleLowerCase()}-${pageNo}`,
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
}
