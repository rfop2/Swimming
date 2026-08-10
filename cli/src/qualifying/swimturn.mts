import * as cheerio from "cheerio"
import { fetchPage, secondsToTime } from "lib"
import type { QualifyingStagingRow, StrokeType } from "lib"
import { normalizeAreaCode } from "./normalize.mjs"

const BASE_URL = "https://swimturn.com"
const NATION_URL = `${BASE_URL}/qt/great-britain/swim-england`
const API_BASE = "https://api.swimturn.com/v1/leagues"

// Scottish Swimming / Swim Wales branches could be added here later — not yet
// confirmed to follow the same URL/link pattern as Swim England.

const STROKE_MAP: Record<string, StrokeType> = {
  "Free": "freestyle",
  "Breast": "breaststroke",
  "Back": "backstroke",
  "Fly": "butterfly",
  "IM": "individual_medley",
}

export interface SwimturnOptions {
  year: number
  force: boolean
  scope: "county" | "regional" | "both"
}

interface DiscoveredLeague {
  scope: "county" | "regional"
  areaName: string
}

interface ChildLink {
  name: string
  url: string
}

const labelFromUrl = ( url: string ): string =>
  new URL( url ).pathname.split( "/" ).filter( Boolean ).pop() ?? "unknown"

// Finds direct-child hub links, e.g. from a region page, the county pages one
// level below it — not the region page's own league link (different prefix).
const parseChildLinks = ( html: string, hrefPrefix: string ): ChildLink[] => {
  const $ = cheerio.load( html )
  const seen = new Set<string>()
  const links: ChildLink[] = []
  $( `a[href^="${hrefPrefix}/"]` ).each( ( _, el ) => {
    const href = $( el ).attr( "href" ) ?? ""
    const rest = href.slice( hrefPrefix.length + 1 )
    if ( !rest || rest.includes( "/" ) || seen.has( href ) ) return
    seen.add( href )
    links.push( { name: $( el ).text().trim(), url: new URL( href, BASE_URL ).toString() } )
  } )
  return links
}

// Finds "/qt/leagues/{id}/{slug}" links, e.g. `GB, Bedfordshire County QT (v2026.12)`.
const parseLeagueLinks = ( html: string ): Array<{ leagueId: number, areaName: string }> => {
  const $ = cheerio.load( html )
  const results: Array<{ leagueId: number, areaName: string }> = []
  $( 'a[href^="/qt/leagues/"]' ).each( ( _, el ) => {
    const href = $( el ).attr( "href" ) ?? ""
    const idMatch = href.match( /\/qt\/leagues\/(\d+)\// )
    if ( !idMatch ) return
    const text = $( el ).text().trim()
    const nameMatch = text.match( /^GB,\s*(.+?)\s+(?:Region|County)\s+QT/i )
    if ( !nameMatch ) return
    results.push( { leagueId: Number( idMatch[1] ), areaName: nameMatch[1]!.trim() } )
  } )
  return results
}

interface SwimturnCourseTuple extends Array<number | string | Record<string, unknown>> {
  0: number
  1: string
  2: Record<string, unknown>
}

interface SwimturnLeagueTime {
  age: number
  gender: string
  stroke: string
  distance: string
  courses: {
    LC?: SwimturnCourseTuple[]
    SC?: SwimturnCourseTuple[]
  }
}

interface SwimturnLeagueResponse {
  id: number
  name: string
  version: string
  target_names?: Record<string, { short: string, long: string }>
  league_times_attributes?: SwimturnLeagueTime[]
}

const parseLeagueJson = (
  json: SwimturnLeagueResponse,
  scope: "county" | "regional",
  areaName: string,
  year: number,
  sourceUrl: string,
): QualifyingStagingRow[] => {
  const rows: QualifyingStagingRow[] = []
  const sourceYear = Number( json.version?.split( "." )[0] ) || undefined
  const area = normalizeAreaCode( areaName, scope === "regional" ? "region" : "county" )

  const qualKeys = new Set(
    Object.entries( json.target_names ?? {} )
      .filter( ( [ , v ] ) => v.short === "qual" )
      .map( ( [ k ] ) => k )
  )

  for ( const entry of json.league_times_attributes ?? [] ) {
    const stroke = STROKE_MAP[entry.stroke]
    if ( !stroke ) continue
    const gender = entry.gender?.toLowerCase()
    if ( gender !== "male" && gender !== "female" ) continue
    const distance = `${entry.distance}m` as QualifyingStagingRow["distance"]
    const age = String( entry.age )

    for ( const course of [ "LC", "SC" ] as const ) {
      const qualTuple = ( entry.courses?.[course] ?? [] ).find( t => qualKeys.has( t[1] ) )
      if ( !qualTuple ) continue
      const time = qualTuple[0] / 1000
      const timeString = secondsToTime( time, 2 )

      rows.push( {
        source: "swimturn",
        year,
        sourceYear,
        sourceUrl,
        course: course.toLowerCase() as "lc" | "sc",
        stroke,
        distance,
        scope,
        area,
        type: "general",
        gender,
        age,
        timeString,
        time,
      } )
    }
  }

  return rows
}

export const fetchSwimturn = async ( { year, force, scope }: SwimturnOptions ): Promise<QualifyingStagingRow[]> => {
  const discovered = new Map<number, DiscoveredLeague>()

  const hubPage = await fetchPage( {
    label: "qualifying_sw_swim_england",
    url: new URL( NATION_URL ),
    type: "qualifying",
  }, force ? 0 : undefined )

  const regions = parseChildLinks( String( hubPage.content ), new URL( NATION_URL ).pathname )
  console.log( `  swimturn.com: found ${regions.length} regions under Swim England` )

  for ( const region of regions ) {
    let regionHtml: string
    try {
      const regionPage = await fetchPage( {
        label: `qualifying_sw_region_${labelFromUrl( region.url )}`,
        url: new URL( region.url ),
        type: "qualifying",
      }, force ? 0 : undefined )
      regionHtml = String( regionPage.content )
    } catch ( e ) {
      console.error( `  Skipping region ${region.name}: ${e}` )
      continue
    }

    if ( scope !== "county" ) {
      for ( const league of parseLeagueLinks( regionHtml ) ) {
        if ( !discovered.has( league.leagueId ) ) {
          discovered.set( league.leagueId, { scope: "regional", areaName: league.areaName } )
        }
      }
    }

    if ( scope !== "regional" ) {
      const counties = parseChildLinks( regionHtml, new URL( region.url ).pathname )
      for ( const county of counties ) {
        try {
          const countyPage = await fetchPage( {
            label: `qualifying_sw_county_${labelFromUrl( county.url )}`,
            url: new URL( county.url ),
            type: "qualifying",
          }, force ? 0 : undefined )
          for ( const league of parseLeagueLinks( String( countyPage.content ) ) ) {
            if ( !discovered.has( league.leagueId ) ) {
              discovered.set( league.leagueId, { scope: "county", areaName: league.areaName } )
            }
          }
        } catch ( e ) {
          console.error( `  Skipping county ${county.name}: ${e}` )
        }
      }
    }
  }

  console.log( `  swimturn.com: discovered ${discovered.size} leagues` )

  const rows: QualifyingStagingRow[] = []
  let skipped = 0
  for ( const [ leagueId, info ] of discovered ) {
    try {
      const apiUrl = `${API_BASE}/${leagueId}`
      const apiPage = await fetchPage( {
        label: `qualifying_sw_league_${leagueId}`,
        url: new URL( apiUrl ),
        type: "qualifying",
      }, force ? 0 : undefined )
      const json = JSON.parse( String( apiPage.content ) ) as SwimturnLeagueResponse
      const leagueRows = parseLeagueJson( json, info.scope, info.areaName, year, apiUrl )
      rows.push( ...leagueRows )
      console.log( `  League ${leagueId} (${info.areaName}, ${info.scope}): ${leagueRows.length} rows` )
    } catch ( e ) {
      console.error( `  Skipping league ${leagueId} (${info.areaName}): ${e}` )
      skipped++
    }
  }

  console.log( `  swimturn.com: parsed ${rows.length} rows from ${discovered.size - skipped}/${discovered.size} leagues` )
  return rows
}
