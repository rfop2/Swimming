import type { ImportEvent } from "../../types"

const ageGroups = [ "10-11", "12", "13", "14", "15", "16", "17+" ] as const
const eventPattern = /^(50|100|200|400|800|1500)m\s+(Freestyle|Breaststroke|Fly|Backstroke|IM)\*?\s+(.+)$/i
const timePattern = /^(?:\d{1,2}:\d{2}(?:\.\d{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/

const strokeNames: Record<string, string> = {
  freestyle: "Freestyle",
  breaststroke: "Breaststroke",
  fly: "Butterfly",
  backstroke: "Backstroke",
  im: "Individual Medley",
}

function parseTimes( value: string ): Array<string | null> | null {
  const values = value.split( /\s+/ ).filter( Boolean ).map( token => /^x+$/i.test( token ) ? null : token )
  if ( values.length !== ageGroups.length ) return null
  if ( !values.every( time => time === null || timePattern.test( time ) ) ) return null
  return values
}

function appendRows(
  rows: ImportEvent[],
  gender: "male" | "female",
  event: { distance: string, stroke: string, name: string },
  times: Array<string | null>
) {
  ageGroups.forEach( ( age, index ) => {
    if ( age === "10-11" ) {
      rows.push( { gender, course: "sc", event: event.name, distance: event.distance, stroke: event.stroke, age: "10", time: times[0] } )
      rows.push( {
        gender,
        course: "sc",
        event: event.name,
        distance: event.distance,
        stroke: event.stroke,
        age: "11",
        time: times[0] ?? times[1],
      } )
      return
    }

    rows.push( {
      gender,
      course: "sc",
      event: event.name,
      distance: event.distance,
      stroke: event.stroke,
      age,
      time: times[index],
    } )
  } )
}

// Cornwall 2027 contains alternating QT and consideration rows. The app stores one
// General threshold, so only the event/QT rows are imported. For long-distance events,
// age 10 remains unavailable while age 11 uses the published age-12 QT.
export function parseSwimmingPdfLayout29( text: string ): ImportEvent[] {
  const rows: ImportEvent[] = []
  let gender: "male" | "female" | null = null

  for ( const rawLine of text.split( "\n" ) ) {
    const line = rawLine.replace( /\s+/g, " " ).trim()
    if ( /^male\s*\/\s*open$/i.test( line ) ) {
      gender = "male"
      continue
    }
    if ( /^female$/i.test( line ) ) {
      gender = "female"
      continue
    }
    if ( !gender ) continue

    const match = eventPattern.exec( line )
    if ( !match ) continue
    const times = parseTimes( match[3] )
    const stroke = strokeNames[match[2].toLowerCase()]
    if ( !times || !stroke ) continue

    const distance = `${match[1]}m`
    appendRows( rows, gender, { distance, stroke, name: `${stroke} ${distance}` }, times )
  }

  return rows
}
