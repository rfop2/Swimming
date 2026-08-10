import * as cheerio from "cheerio"
import { fetchPage, secondsToTime } from "lib"
import type { QualifyingStagingRow, StrokeType, GenderType } from "lib"
import { normalizeAreaCode } from "./normalize.mjs"

const BASE_URL = "https://swimming-times.com"
const DIRECTORY_URL = `${BASE_URL}/qualifying-times/`

const STROKE_MAP: Record<string, StrokeType> = {
  "freestyle": "freestyle",
  "backstroke": "backstroke",
  "breaststroke": "breaststroke",
  "butterfly": "butterfly",
  "individual medley": "individual_medley",
}

export interface SwimmingTimesOptions {
  year: number
  force: boolean
  scope: "county" | "regional" | "both"
}

interface CountyLink {
  name: string
  slug: string
  listedYear: number
  url: string
}

const parseDirectory = ( html: string ): CountyLink[] => {
  const $ = cheerio.load( html )
  const links: CountyLink[] = []
  $( "li strong" ).each( ( _, el ) => {
    const name = $( el ).text().trim()
    const anchor = $( el ).parent( "li" ).find( "a" ).first()
    const href = anchor.attr( "href" ) ?? ""
    const match = href.match( /\/qualifying-times\/([a-z0-9-]+)-(\d{4})\/?$/ )
    if ( !match ) return
    const [ , slug, yearStr ] = match
    links.push( { name, slug, listedYear: Number( yearStr ), url: new URL( href, BASE_URL ).toString() } )
  } )
  return links
}

// swimming-times.com is inconsistent about time format between counties: some use
// dot-separated "M.SS.d"/"SS.d" (e.g. "1.45.8", "43.6"), others colon-separated
// "M:SS.d" (e.g. "11:45.9"). A handful of cells (seen on long events like 1500m
// Free / 400 IM) leak a raw Excel time-serial fraction like "0.015833333333333335"
// instead of a formatted time — reject anything whose components aren't 1-2 digits
// rather than silently computing garbage seconds. Missing times show as "—" or "-".
const parseTime = ( raw: string ): number | null => {
  const text = raw.trim()
  if ( !text || text === "—" || text === "-" ) return null

  if ( text.includes( ":" ) ) {
    const parts = text.split( ":" )
    if ( !parts.every( p => /^\d{1,2}(\.\d{1,2})?$/.test( p ) ) ) return null
    return parts.map( Number ).reduce( ( acc, n ) => acc * 60 + n, 0 )
  }

  const parts = text.split( "." )
  if ( parts.length < 2 || parts.length > 3 || !parts.every( p => /^\d{1,2}$/.test( p ) ) ) return null
  const nums = parts.map( Number )
  if ( nums.length === 3 ) {
    const [ min, sec, decisecond ] = nums
    return min * 60 + sec + decisecond / 10
  }
  const [ sec, decisecond ] = nums
  return sec + decisecond / 10
}

// Age-group headings vary by county: "10/11" or "10-11" (expand to two rows),
// "16 & over" / "16 and over" / "16&Ov" (-> "16+", matching the DB's "N+" convention),
// "16/17&Ov" (bracket plus open-ended, -> "16" and "17+"), "17+ Years" (strip
// " Years"), or a plain "12" / "Open".
const parseAgeGroup = ( heading: string ): string[] => {
  const ageText = heading.split( "—" )[0]?.trim().replace( /\s+Years$/i, "" ) ?? ""
  if ( !ageText ) return []

  const comboOpenEnded = ageText.match( /^(\d+)\s*\/\s*(\d+)\s*(?:&|and)\s*ov(?:er)?$/i )
  if ( comboOpenEnded ) return [ comboOpenEnded[1]!, `${comboOpenEnded[2]}+` ]

  const bracket = ageText.match( /^(\d+)\s*[/-]\s*(\d+)$/ )
  if ( bracket ) return [ bracket[1]!, bracket[2]! ]

  const openEnded = ageText.match( /^(\d+)\s*(?:&|and)\s*ov(?:er)?$/i )
  if ( openEnded ) return [ `${openEnded[1]}+` ]

  return [ ageText ]
}

const parseCountyPage = (
  html: string,
  areaName: string,
  year: number,
  sourceYear: number,
  sourceUrl: string,
): QualifyingStagingRow[] => {
  const rows: QualifyingStagingRow[] = []
  const $ = cheerio.load( html )
  const area = normalizeAreaCode( areaName, "county" )

  let currentGender: GenderType | null = null

  $( "h2, .tblwrap" ).each( ( _, el ) => {
    const tag = el.tagName?.toLowerCase()

    if ( tag === "h2" ) {
      const text = $( el ).text()
      if ( /female/i.test( text ) ) currentGender = "female"
      else if ( /male/i.test( text ) ) currentGender = "male"
      return
    }

    if ( !currentGender ) return

    const heading = $( el ).prev( "h3" ).text().trim()
    const ages = parseAgeGroup( heading )
    if ( !ages.length ) return

    $( el ).find( "tbody tr" ).each( ( _rowIndex, tr ) => {
      const eventText = $( tr ).find( "th" ).first().text().trim()
      const eventMatch = eventText.match( /^(\d+)m\s+(.+)$/i )
      if ( !eventMatch ) return
      const distance = `${eventMatch[1]}m` as QualifyingStagingRow["distance"]
      const stroke = STROKE_MAP[eventMatch[2]!.trim().toLowerCase()]
      if ( !stroke ) return

      const cells = $( tr ).find( "td" )
      const courseCells: Array<[ "lc" | "sc", string | undefined ]> = [
        [ "lc", cells.eq( 0 ).text() ],
        [ "sc", cells.eq( 2 ).text() ],
      ]

      for ( const [ course, raw ] of courseCells ) {
        if ( raw === undefined ) continue
        const time = parseTime( raw )
        if ( time === null ) {
          const trimmed = raw.trim()
          if ( trimmed && trimmed !== "—" && trimmed !== "-" ) {
            console.warn( `  Unrecognized time value '${trimmed}' for ${eventText} (${sourceUrl}) — skipping` )
          }
          continue
        }
        const timeString = secondsToTime( time, 2 )

        for ( const age of ages ) {
          rows.push( {
            source: "swimming-times",
            year,
            sourceYear,
            sourceUrl,
            course,
            stroke,
            distance,
            scope: "county",
            area,
            type: "general",
            gender: currentGender as GenderType,
            age,
            timeString,
            time,
          } )
        }
      }
    } )
  } )

  return rows
}

export const fetchSwimmingTimes = async ( { year, force, scope }: SwimmingTimesOptions ): Promise<QualifyingStagingRow[]> => {
  if ( scope === "regional" ) {
    console.log( "  swimming-times.com: regional standards live on a separate sub-app — not scraped yet, skipping" )
    return []
  }

  const directoryPage = await fetchPage( {
    label: "qualifying_st_directory",
    url: new URL( DIRECTORY_URL ),
    type: "qualifying",
  }, force ? 0 : undefined )

  const counties = parseDirectory( String( directoryPage.content ) )
  console.log( `  swimming-times.com: found ${counties.length} counties in directory` )

  const rows: QualifyingStagingRow[] = []
  let skipped = 0

  for ( const county of counties ) {
    try {
      const page = await fetchPage( {
        label: `qualifying_st_${county.slug}_${county.listedYear}`,
        url: new URL( county.url ),
        type: "qualifying",
      }, force ? 0 : undefined )

      const countyRows = parseCountyPage( String( page.content ), county.name, year, county.listedYear, county.url )
      rows.push( ...countyRows )
    } catch ( e ) {
      console.error( `  Skipping ${county.name}: ${e}` )
      skipped++
    }
  }

  console.log( `  swimming-times.com: parsed ${rows.length} rows from ${counties.length - skipped}/${counties.length} counties` )
  return rows
}
