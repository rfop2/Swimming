import { IndividualStats, LatLon, Meet, PageInfo, Ranking, RankingRow, ResultData, Results, Swimmer } from "./types.js"
import { getSwimmerAgeGroup, rng, sleep, timeToSeconds } from "./lib.js"
import { stat, readFile, writeFile } from "fs/promises"
import { CACHE_DIR, DEFAULT_CACHE_TIME, MAX_FETCH_INTERVAL, MIN_FETCH_INTERVAL } from "./config.js"
import { differenceInDays, differenceInHours, format, parse } from "date-fns"
import type { AnyNode } from "domhandler"
import type { Cheerio, CheerioAPI } from "cheerio"
import { getPool, prepareStatement } from "./database.js"

export const BASE_URL = "https://www.swimmingresults.org"

export const COURSES: Record<string,string> = {
  "sc": "Short Course",
  "lc": "Long Course",
}

export const NATIONALITY: Record<string,string> = {
  BRITISH:  "A",
  ENGLAND:  "E",
  SCOTLAND:  "S",
  WALES:  "W",
  JERSEY:  "J",
  GUERNSEY:  "G",
  ISLE_OF_MAN:  "I",
  ALL_MEMBERS:  "X",
}

const transform = ( input: string ): string => input
  .toLowerCase()
  .replace( /_/g, " " )
  .replace( /\b\w/g, c => c.toUpperCase() )

export const NATIONALITIES = Object.fromEntries( Object.entries( NATIONALITY ).map( ( [ k, v ] ) => [ v, transform( k ) ] ) )

export const REGIONS: Record<string,string> = {
  "P": "No Region",
  "A": "East Midland",
  "T": "East",
  "L": "London",
  "E": "North East",
  "N": "North West",
  "S": "South East",
  "W": "South West",
  "M": "West Midlands",
  "[NEWATLSM]": "England",
  "X": "Scotland",
  "Y": "Wales",
  "[NE]": "English North Zone",
  "[MAT]": "English Midland Zone",
  "[LSW]": "English South Zone",
  "[MA]": "English Midlands",
}

export const COUNTIES: Record<string,string> = {
  "XXXX": "No County",
  "BDFT": "Bedfordshire",
  "BSBS": "Berkshire & South Bucks",
  "CMBT": "Cambridgeshire",
  "CHRN": "Cheshire",
  "CWLW": "Cornwall",
  "CUMN": "Cumbria",
  "DRBA": "Derbyshire",
  "DVNW": "Devon",
  "DRSW": "Dorset",
  "SEDX": "East Scotland",
  "ESXQ": "Essex",
  "GLUW": "Gloucester",
  "HNTS": "Hampshire",
  "HRTT": "Hertfordshire",
  "KNTQ": "Kent",
  "LNCN": "Lancashire",
  "LECA": "Leicestershire",
  "LNCA": "Lincolnshire",
  "SMDX": "Mid Scotland",
  "MDXL": "Middlesex",
  "NRFT": "Norfolk",
  "SNDX": "North Scotland",
  "NWAY": "North Wales",
  "NHPA": "Northamptonshire",
  "NDRE": "Northumberland & Durham",
  "NTMA": "Nottinghamshire",
  "ONBS": "Oxfordshire & North Bucks",
  "SHPM": "Shropshire",
  "SMSW": "Somerset",
  "STFM": "Staffordshire",
  "EWAY": "South East Wales",
  "WWAY": "South West Wales",
  "SFKT": "Suffolk",
  "SRYQ": "Surrey",
  "SSXS": "Sussex",
  "WWKM": "Warwickshire",
  "SCWX": "West Scotland",
  "WLTW": "Wiltshire",
  "WRCM": "Worcester",
  "YRKE": "Yorkshire",
}

export const STROKE_DISTANCE = {
  FREESTYLE__50M: "1",
  FREESTYLE__100M: "2",
  FREESTYLE__200M: "3",
  FREESTYLE__400M: "4",
  FREESTYLE__800M: "5",
  FREESTYLE__1500M: "6",
  BACKSTROKE__50M: "13",
  BACKSTROKE__100M: "14",
  BACKSTROKE__200M: "15",
  BREASTSTROKE__50M: "7",
  BREASTSTROKE__100M: "8",
  BREASTSTROKE__200M: "9",
  BUTTERFLY__50M: "10",
  BUTTERFLY__100M: "11",
  BUTTERFLY__200M: "12",
  INDIVIDUAL_MEDLEY__100M: "18",
  INDIVIDUAL_MEDLEY__150M: "19",
  INDIVIDUAL_MEDLEY__200M: "16",
  INDIVIDUAL_MEDLEY__400M: "17",
}

export const strokeLookup = Object.fromEntries( Object.entries( STROKE_DISTANCE ).map( ( [ k,v ] ) => [ v,k ] ) )

export const strokeSort: Record<string,number> = {
  freestyle: 0,
  breaststroke: 1,
  butterfly: 2,
  backstroke: 3,
  individual_medley: 4
}

const strokeData = Object.entries( STROKE_DISTANCE ).reduce( ( strokes, [ strokeDistance, code ] ) => {
  const matches = strokeDistance.toLocaleLowerCase().match( /(?<stroke>\w+)__(?<distance>\d+m)$/ )
  if ( !matches ) {
    throw new Error( `Can't match stroke/distance on '${strokeDistance}'` )
  }
  const { stroke = "", distance = "" } = { ...matches?.groups }
  if ( !strokes[stroke] ) {
    strokes[stroke] = {
      label: stroke.replace( /_/g, " " ).replace( /\b\w/g, char => char.toUpperCase() ),
      order: strokeSort[stroke],
      distances: [ distance ],
      codes: [ code ],
    }
  } else {
    strokes[stroke].distances.push( distance )
    strokes[stroke].codes.push( code )
  }
  return strokes
}, {} as Record<string,{ label: string, order: number, distances: Array<string>, codes: Array<string>}> )

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const strokes = Object.fromEntries( Object.entries( strokeData ).sort( ( [ _keyA, valA ], [ _keyB, valB ] ) => valA.order - valB.order ) )

export const POOLS = {
  SHORT: "S",
  LONG: "L",
}

export const AGES = [
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "Open"
]

export const individualBaseUrl = "/individualbest/personal_best.php"

export const individualParams = ( swimmer: Swimmer ) => ( {
  mode: "A",
  tiref: swimmer.id,
} )

export const rankBaseUrl = "/12months/last12.php"

export const globalRankParams = ( swimmer: Swimmer, page = 1 ) => ( {
  Sex: swimmer.gender.substring( 0, 1 ).toUpperCase(),
  AgeGroup: getSwimmerAgeGroup( swimmer ),
  date: new Date( new Date().getFullYear(), 11, 31 ).toLocaleDateString( "en-GB" ),
  StartNumber: String( ( ( page - 1 ) * 100 ) + 1 ),
  RecordsToView: "100",
  TargetNationality: NATIONALITY.BRITISH,
} )

export const nationalRankParams = {
  Level: "N",
  TargetRegion: "P",
  TargetCounty: "XXXX",
  TargetClub: "XXXX",
}

export const regionalRankParams = {
  Level: "D",
  TargetRegion: "",
  TargetCounty: "XXXX",
  TargetClub: "XXXX",
}

export const countyRankParams = {
  Level: "C",
  TargetRegion: "P",
  TargetCounty: "",
  TargetClub: "XXXX",
}

export const resultsBaseUrl = "/individualbest/personal_best_time_date.php"

export const resultsParams = ( swimmer: Swimmer ) => ( {
  // back: "individualbestname",
  tiref: swimmer.id,
  mode: "A",
} )

export const meetsBaseUrl = "/licensed_meets/"

export const meetsParams = ( page: number, region: string ) => ( {
  page: String( page ),
  region,
  level: "P",
  month: "P",
  year: "P",
} )

export const meetBaseUrl = `${meetsBaseUrl}/meet.php`

export const meetParams = ( page: number, region: string, meet: number ) => ( {
  meet,
  page,
  region,
  level: "P",
  month: "P",
  year: "P",
} )

export const createUrl = ( base: string, params: Record<string, string> ) => {
  const url = new URL( BASE_URL + base )
  url.search = new URLSearchParams( params ).toString()
  return url
}

export const fetchPage = async ( pageInfo: PageInfo, cacheTime: number = DEFAULT_CACHE_TIME ) => {
  const contentFile = CACHE_DIR + "/" + pageInfo.label
  console.log( `Processing ${pageInfo.label} -> ${pageInfo.url}` )
  try {
    const stats = await stat( contentFile )
    // Page has been cached
    const fileAge = differenceInHours( Date.now(), stats.mtime )
    if ( fileAge < cacheTime ) {
      // Page is new enough
      console.log( `Reading ${contentFile}, cached: ${fileAge} hours` )
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
    const headers = new Headers( {
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
    } )
    if ( pageInfo.referrer ) {
      headers.append( "Referer", pageInfo.referrer.toString() )
    } else {
      headers.append( "Referer", BASE_URL )
    }
    const response = await fetch( pageInfo.url, {
      method: "GET",
      headers,
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
        headers.push( $( cellElement ).text().toLocaleLowerCase().replace( /\s+/g, "_" ) )
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
    const extraData = rowFunc ? rowFunc( $, valueCells ) : {}
    dataObject.push( { ...rowData, ...extraData } )
  } )
  return dataObject
}

export const parseIndividual = ( pageInfo: PageInfo, $: CheerioAPI ) => {
  const headers = $( "p.rnk_sj" )
  const tables = $( "[id='rankTable'] tbody" )
  const data: Array<IndividualStats> = []
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

      const courseRow: IndividualStats = {
        course,
        stroke: stroke.replace( /\s/g, "_" ).toLocaleLowerCase(),
        distance: `${distance}m`,
        time: timeToSeconds( course === "lc" ? row.lc_time : row.sc_time ),
        converted_time: timeToSeconds( course === "lc" ? row.converted_to_sc : row.converted_to_lc ),
        wa_pts: Number( course === "lc" ? row.lc_wa_pts : row.sc_wa_pts ),
        date: format( parse( row.date, "dd/MM/yy", new Date() ), "yyyy-MM-dd" ),
        meet: row.meet,
        venue: row.venue,
        licence: row.licence ?? row.license ?? null,
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

export const parseRanking = ( pageInfo: PageInfo, $: CheerioAPI ) => {
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
        name: row.name,
        swimmer: row.swimmer,
        ranked_club: row.ranked_club,
        yob: Number( row.yob ),
        meet_name: row.meet_name,
        venue: row.venue,
        level: Number( row.level ),
        date: format( parse( row.date, "dd/MM/yy", new Date() ), "yyyy-MM-dd" ),
        time: timeToSeconds( row.time ),
        fina: Number( row.fina ),
      }
      data.table.push( rankingRow )
    }
  }
  return data
}

export const parseResults = ( pageInfo: PageInfo, $: CheerioAPI ) => {
  const tables = $( "[id='rankTable'] tbody" )
  const data: Results = []
  const table = extractTableData( $, $( tables[1] ) )
  if ( table.length ) {
    // Do any conversions
    for ( const row of table ) {
      const resultRow: ResultData = {
        time: timeToSeconds( row.time ),
        wa_pts: Number( row.wa_pts ),
        round: row.round,
        date: format( parse( row.date, "dd/MM/yy", new Date() ), "yyyy-MM-dd" ),
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
        headers.push( $( cellElement ).text().trim().toLocaleLowerCase().replace( /\W+/g, "_" ) )
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

export const parseMeets = ( pageInfo: PageInfo, $: CheerioAPI ) => {
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
        date: format( parse( `${row.date[0]} ${row.date[2]}`, "dd MMM yyyy", new Date() ), "yyyy-MM-dd" ),
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

const insertLocationsSql =
`INSERT INTO Locations (
  created,
  location,
  latitude,
  longitude
)
VALUES (
  :created,
  :location,
  :latitude,
  :longitude
);`

const geocodeTown = async ( town: string ): Promise<LatLon | undefined> => {
  const getLocation = prepareStatement<{ location: string },LatLon>(
    await getPool(),
    "SELECT Latitude, Longitude FROM Locations WHERE Location = :location"
  )
  const saveLocation = prepareStatement( await getPool(), insertLocationsSql )
  let latlon = await getLocation.get( { location: town } ) as LatLon
  if ( latlon === undefined ) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent( town + ", UK" )}`
    )
    const data = await response.json()
    if ( data && data.length > 0 ) {
      latlon = { latitude: Number( data[0].lat ), longitude: Number( data[0].lon ) }
      await saveLocation.run( { created: format( new Date(), "yyyy-MM-dd" ), location: town, ...latlon } )
    } else {
      await saveLocation.run( { created: format( new Date(), "yyyy-MM-dd" ), location: town, latitude: null, longitude: null } )
    }
  }
  return latlon
}

export const parseMeet = async ( pageInfo: PageInfo, $: CheerioAPI, meet: Partial<Meet> ) => {
  const startElem = $( "div.cl-event-date:nth-child(2)" )
  const startParts = $( startElem ).children().map( ( i, el ) => $( el ).text().trim() ).get()
  const startDate = parse( `${startParts[1]} ${startParts[3]}`, "dd MMM yyyy", new Date() )
  const endElem = $( "div.cl-event-date:nth-child(3)" )
  const endParts = $( endElem ).children().map( ( i, el ) => $( el ).text().trim() ).get()
  const endDate = parse( `${endParts[1]} ${endParts[3]}`, "dd MMM yyyy", new Date() )

  meet.duration = 1 + differenceInDays( endDate, startDate )

  meet.name = $( ".cl-infobox > h2:nth-child(1)" ).text()

  const details: Record<string, string> = {}
  const list = $( ".cl-infobox > dl:nth-child(2)" )
  list
    .children()
    .each( ( _, el ) => {
      if ( el.tagName.toLocaleLowerCase() === "dt" ) {
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
