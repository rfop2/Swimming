import type { ImportEvent } from "../../types"

const ages = [ "10-11", "12", "13", "14", "15", "16", "17", "18+" ] as const
const rowPattern = /^(.+?)\s+(50|100|200|400|800|1500)m\s+(Freestyle|Breaststroke|Butterfly|Backstroke|Ind(?:ividual)?\s+Medley)\s+(.+)$/i
const timePattern = /^\d{1,2}\.\d{1,2}(?:\.\d)?$/

function normalizeWarwickshireTime( value: string | null ): string | null {
  if ( !value ) return null
  const minuteTime = /^(\d{1,2})\.(\d{2})\.(\d)$/i.exec( value )
  return minuteTime ? `${minuteTime[1]}:${minuteTime[2]}.${minuteTime[3]}` : value
}

function parseTimes( value: string ): Array<string | null> | null {
  const times = value.split( /\s+/ ).filter( Boolean )
  if ( !times.every( time => timePattern.test( time ) ) ) return null

  if ( times.length === ages.length ) return times.map( normalizeWarwickshireTime )
  if ( times.length === ages.length - 1 ) return [ null, ...times.map( normalizeWarwickshireTime ) ]
  return null
}

function appendRows(
  rows: ImportEvent[],
  gender: "male" | "female",
  distance: string,
  stroke: string,
  times: Array<string | null>
) {
  const event = `${stroke} ${distance}`

  for ( let index = 0; index < ages.length; index++ ) {
    const age = ages[index]
    const time = times[index] ?? null

    if ( age === "10-11" ) {
      rows.push( { gender, course: "sc", event, distance, stroke, age: "10", time } )
      rows.push( { gender, course: "sc", event, distance, stroke, age: "11", time } )
    } else {
      rows.push( { gender, course: "sc", event, distance, stroke, age, time } )
    }
  }
}

// Warwickshire County Championships 2027 short-course qualification times.
// Each row contains female times, the event, then open/male times.
// Values such as 1.28.3 represent 1:28.3 and are normalized without dropping the decimal digit.
export function parseSwimmingPdfLayout18( text: string ): ImportEvent[] {
  const rows: ImportEvent[] = []
  const lines = text.split( "\n" ).map( line => line.trim() ).filter( Boolean )

  for ( const line of lines ) {
    const match = rowPattern.exec( line )
    if ( !match ) continue

    const femaleTimes = parseTimes( match[1] )
    const maleTimes = parseTimes( match[4] )
    if ( !femaleTimes || !maleTimes ) continue

    const distance = `${match[2]}m`
    const stroke = /^ind/i.test( match[3] ) ? "Individual Medley" : match[3]

    appendRows( rows, "female", distance, stroke, femaleTimes )
    appendRows( rows, "male", distance, stroke, maleTimes )
  }

  return rows
}
