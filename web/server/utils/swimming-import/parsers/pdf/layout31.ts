import type { ImportEvent } from "../../types"

const eventPattern = /(50|100|200|400|800|1500)m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Ind\.\s*Medley)/i
const timePattern = /^\d{1,2}(?:[.:]\d{1,2}){1,2}$/

const strokeNames = new Map( [
  [ "freestyle", "Freestyle" ],
  [ "backstroke", "Backstroke" ],
  [ "breaststroke", "Breaststroke" ],
  [ "butterfly", "Butterfly" ],
  [ "ind. medley", "Individual Medley" ],
] )

function normalizeCheshireTime( value: string ): string | null {
  const time = value.replace( /\.{2,}/g, "." ).trim()
  if ( !timePattern.test( time ) ) return null

  const minuteTime = /^(\d{1,2})[.:](\d{1,2})[.:](\d{1,2})$/.exec( time )
  if ( minuteTime ) {
    return `${minuteTime[1].padStart( 2, "0" )}:${minuteTime[2].padStart( 2, "0" )}.${minuteTime[3].padEnd( 2, "0" )}`
  }

  return time
}

function parseTimes( value: string, expected: number ): Array<string | null> | null {
  const tokens = value.split( /\s+/ ).filter( token => timePattern.test( token.replace( /\.{2,}/g, "." ) ) )
  if ( tokens.length > expected ) return null

  return [ ...Array( expected - tokens.length ).fill( null ), ...tokens.map( normalizeCheshireTime ) ]
}

function appendRows(
  rows: ImportEvent[],
  gender: "male" | "female",
  ages: readonly string[],
  event: { distance: string, stroke: string, name: string },
  times: Array<string | null>
) {
  ages.forEach( ( age, index ) => {
    rows.push( {
      gender,
      course: "sc",
      event: event.name,
      distance: event.distance,
      stroke: event.stroke,
      age,
      time: times[index] ?? null,
    } )
  } )
}

// Cheshire splits its table across two pages: ages 10-13 on page one and
// ages 14-Open on page two. The event sits between male and female values.
export function parseSwimmingPdfLayout31( text: string ): ImportEvent[] {
  const source = text.toLowerCase()
  if (
    !source.includes( "cheshire county w.p. & s.a. swimming championships 2027" )
    || !source.includes( "consideration times" )
  ) return []

  const rows: ImportEvent[] = []
  let ages: readonly string[] = []

  for ( const rawLine of text.split( "\n" ) ) {
    const line = rawLine.replace( /\s+/g, " " ).trim()
    if ( /^10 years 11 years 12 years 13 years event/i.test( line ) ) {
      ages = [ "10", "11", "12", "13" ]
      continue
    }
    if ( /^14 years 15 years 16 years open event/i.test( line ) ) {
      ages = [ "14", "15", "16", "17+" ]
      continue
    }
    if ( ages.length === 0 ) continue

    const match = eventPattern.exec( line )
    if ( !match || match.index === undefined ) continue

    const maleTimes = parseTimes( line.slice( 0, match.index ), ages.length )
    const femaleTimes = parseTimes( line.slice( match.index + match[0].length ), ages.length )
    const stroke = strokeNames.get( match[2].toLowerCase().replace( /\s+/g, " " ) )
    if ( !maleTimes || !femaleTimes || !stroke ) continue

    const distance = `${match[1]}m`
    const event = { distance, stroke, name: `${stroke} ${distance}` }
    appendRows( rows, "male", ages, event, maleTimes )
    appendRows( rows, "female", ages, event, femaleTimes )
  }

  return rows
}
