import type { ImportEvent } from "../../types"

const ageGroups = [ "10-11", "12", "13", "14", "15", "16", "17", "18+" ] as const
const timePattern = /^\d{1,2}:\d{2}\.\d{1,2}$/
const rowPattern = /^(.+?)\s+(50|100|200|400|800|1500)m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|IM)\s+(.+)$/i

const strokeNames: Record<string, string> = {
  freestyle: "Freestyle",
  backstroke: "Backstroke",
  breaststroke: "Breaststroke",
  butterfly: "Butterfly",
  im: "Individual Medley",
}

function parseTimes( value: string ): Array<string | null> | null {
  const times = value.split( /\s+/ ).filter( Boolean )
  if ( !times.every( time => timePattern.test( time ) ) ) return null
  if ( times.length === ageGroups.length ) return times
  if ( times.length === ageGroups.length - 1 ) return [ null, ...times ]
  return null
}

function appendGenderRows(
  rows: ImportEvent[],
  gender: "male" | "female",
  event: { distance: string, stroke: string, name: string },
  times: Array<string | null>
) {
  ageGroups.forEach( ( age, index ) => {
    const expandedAges = age === "10-11" ? [ "10", "11" ] : [ age ]
    for ( const expandedAge of expandedAges ) {
      rows.push( {
        gender,
        course: "sc",
        event: event.name,
        distance: event.distance,
        stroke: event.stroke,
        age: expandedAge,
        time: times[index] ?? null,
      } )
    }
  } )
}

// Essex has eight male/open columns, the event in the centre, and eight
// female columns. The 10/11 value is omitted for the long-distance events.
export function parseSwimmingPdfLayout33( text: string ): ImportEvent[] {
  const source = text.toLowerCase()
  if (
    !source.includes( "swim england essex county age group championships" )
    || !source.includes( "short course consideration times" )
  ) return []

  const rows: ImportEvent[] = []

  for ( const rawLine of text.split( "\n" ) ) {
    const line = rawLine.replace( /\s+/g, " " ).trim()
    const match = rowPattern.exec( line )
    if ( !match ) continue

    const maleTimes = parseTimes( match[1] )
    const femaleTimes = parseTimes( match[4] )
    const stroke = strokeNames[match[3].toLowerCase()]
    if ( !maleTimes || !femaleTimes || !stroke ) continue

    const distance = `${match[2]}m`
    const event = { distance, stroke, name: `${stroke} ${distance}` }
    appendGenderRows( rows, "male", event, maleTimes )
    appendGenderRows( rows, "female", event, femaleTimes )
  }

  return rows
}
