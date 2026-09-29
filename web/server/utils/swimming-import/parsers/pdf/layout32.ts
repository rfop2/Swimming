import type { ImportEvent } from "../../types"

const ageGroups = [ "11-12", "13", "14", "15", "16", "17+" ] as const
const timePattern = /^\d{1,2}(?:[.:]\d{2}){1,2}$/
const rowPattern = /^(50|100|200|400|800|1500)m\s+(Freestyle|Butterfly|Backstroke|Breaststroke|Individual Medley)\s+(.+)$/i

function normalizeEastRegionTime( value: string ): string | null {
  if ( !timePattern.test( value ) ) return null

  const minuteTime = /^(\d{1,2})[.:](\d{2})[.:](\d{2})$/.exec( value )
  if ( minuteTime ) {
    return `${minuteTime[1].padStart( 2, "0" )}:${minuteTime[2]}.${minuteTime[3]}`
  }

  return value
}

function appendGenderRows(
  rows: ImportEvent[],
  gender: "male" | "female",
  event: { distance: string, stroke: string, name: string },
  times: string[]
) {
  ageGroups.forEach( ( age, index ) => {
    const expandedAges = age === "11-12" ? [ "11", "12" ] : [ age ]
    for ( const expandedAge of expandedAges ) {
      rows.push( {
        gender,
        course: "sc",
        event: event.name,
        distance: event.distance,
        stroke: event.stroke,
        age: expandedAge,
        time: normalizeEastRegionTime( times[index] ),
      } )
    }
  } )
}

// East Region lists six female times followed by six male/open times.
// The shared 11/12 column is expanded into separate age 11 and age 12 rows.
export function parseSwimmingPdfLayout32( text: string ): ImportEvent[] {
  const source = text.toLowerCase()
  if (
    !source.includes( "swim england east region long course championships 2026" )
    || !source.includes( "short course times women men/open" )
  ) return []

  const rows: ImportEvent[] = []

  for ( const rawLine of text.split( "\n" ) ) {
    const line = rawLine.replace( /\s+/g, " " ).trim()
    const match = rowPattern.exec( line )
    if ( !match ) continue

    const times = match[3].split( /\s+/ ).filter( Boolean )
    if ( times.length !== ageGroups.length * 2 || !times.every( time => timePattern.test( time ) ) ) continue

    const distance = `${match[1]}m`
    const stroke = match[2]
    const event = { distance, stroke, name: `${stroke} ${distance}` }
    appendGenderRows( rows, "female", event, times.slice( 0, ageGroups.length ) )
    appendGenderRows( rows, "male", event, times.slice( ageGroups.length ) )
  }

  return rows
}
