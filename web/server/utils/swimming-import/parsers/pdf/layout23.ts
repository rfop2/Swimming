import type { ImportEvent } from "../../types"

const ages = [ "10", "11", "12", "13", "14", "15", "16+" ] as const
const timePattern = /^\d{1,2}(?::\d{2})?\.\d{2}$/
const rowPattern = /^(.+?)\s+(50|100|200|400|800|1500)m\s+(Freestyle|Breaststroke|Butterfly|Backstroke|IM)\s+(.+)$/i

function parseTimes( value: string, reverse = false ): Array<string | null> | null {
  const extracted = value.split( /\s+/ ).filter( Boolean )
  if ( !extracted.every( time => timePattern.test( time ) ) ) return null
  if ( extracted.length !== ages.length && extracted.length !== ages.length - 1 ) return null

  const times = reverse ? extracted.reverse() : extracted
  return times.length === ages.length ? times : [ null, ...times ]
}

function appendRows(
  rows: ImportEvent[],
  gender: "female" | "male",
  distance: string,
  stroke: string,
  times: Array<string | null>
) {
  const event = `${stroke} ${distance}`

  ages.forEach( ( age, index ) => {
    rows.push( {
      gender,
      course: "sc",
      event,
      distance,
      stroke,
      age,
      time: times[index] ?? null,
    } )
  } )
}

// Cumbria County Championships 2027 short-course qualifying times.
// Each row contains female ages 10 to 16+, the event, then open/male ages 16+ to 10.
export function parseSwimmingPdfLayout23( text: string ): ImportEvent[] {
  const rows: ImportEvent[] = []

  for ( const rawLine of text.split( "\n" ) ) {
    const line = rawLine.replace( /\s+/g, " " ).trim()
    const match = rowPattern.exec( line )
    if ( !match ) continue

    const femaleTimes = parseTimes( match[1] )
    const maleTimes = parseTimes( match[4], true )
    if ( !femaleTimes || !maleTimes ) continue

    const distance = `${match[2]}m`
    const stroke = /^IM$/i.test( match[3] ) ? "Individual Medley" : match[3]

    appendRows( rows, "female", distance, stroke, femaleTimes )
    appendRows( rows, "male", distance, stroke, maleTimes )
  }

  return rows
}
