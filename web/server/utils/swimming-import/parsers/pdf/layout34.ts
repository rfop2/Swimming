import type { ImportEvent } from "../../types"

const underSixteenAges = [ "10", "11", "12", "13", "14", "15", "16" ] as const
const rowPattern = /^(50|100|200|400|800|1500)m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Individual Medley)\s+(.+)$/i
const timePattern = /\b(?:\d{1,2}:)?\d{1,2}\.\d{2}\b/g

function appendAgeGroup(
  rows: ImportEvent[],
  gender: "male" | "female",
  course: "lc" | "sc",
  event: { distance: string, stroke: string, name: string },
  underSixteenTime: string,
  overSeventeenTime: string
) {
  for ( const age of underSixteenAges ) {
    rows.push( {
      gender,
      course,
      event: event.name,
      distance: event.distance,
      stroke: event.stroke,
      age,
      time: underSixteenTime,
    } )
  }

  rows.push( {
    gender,
    course,
    event: event.name,
    distance: event.distance,
    stroke: event.stroke,
    age: "17+",
    time: overSeventeenTime,
  } )
}

// London Winter lists QT and CT side by side. The application stores one
// threshold per gender/event/age, so only the qualifying-time columns are used.
export function parseSwimmingPdfLayout34( text: string ): ImportEvent[] {
  const source = text.toLowerCase()
  if (
    !source.includes( "se london winter championships 2026" )
    || !source.includes( "qualifying and consideration times" )
  ) return []

  const rows: ImportEvent[] = []
  let course: "lc" | "sc" | null = null

  for ( const rawLine of text.split( "\n" ) ) {
    const line = rawLine.replace( /\s+/g, " " ).trim()
    if ( /^LONG COURSE$/i.test( line ) ) {
      course = "lc"
      continue
    }
    if ( /^SHORT COURSE$/i.test( line ) ) {
      course = "sc"
      continue
    }
    if ( !course ) continue

    const match = rowPattern.exec( line )
    if ( !match ) continue

    const times = match[3].match( timePattern ) ?? []
    if ( times.length !== 8 ) continue

    const distance = `${match[1]}m`
    const stroke = match[2]
    const event = { distance, stroke, name: `${stroke} ${distance}` }

    appendAgeGroup( rows, "male", course, event, times[0], times[2] )
    appendAgeGroup( rows, "female", course, event, times[4], times[6] )
  }

  return rows
}
