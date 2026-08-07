import type { ImportEvent } from "../../types"

const ages = [ "10-11", "12", "13", "14", "15", "16", "17", "18+" ] as const
const eventPattern = /(50|100|200|400|800|1500)m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Individual\s+Medley)/gi
const timePattern = /^\d{1,2}(?:(?::\d{2})?\.\d{2})$/

function parseTimes( value: string ): Array<string | null> | null {
  const times = value.split( /\s+/ ).filter( Boolean )
  if ( !times.every( time => timePattern.test( time ) ) ) return null

  if ( times.length === ages.length ) return times
  if ( times.length === ages.length - 1 ) return [ null, ...times ]
  return null
}

function appendRows(
  rows: ImportEvent[],
  gender: "male" | "female",
  course: "lc" | "sc",
  distance: string,
  stroke: string,
  times: Array<string | null>
) {
  const event = `${stroke} ${distance}`

  for ( let index = 0; index < ages.length; index++ ) {
    const age = ages[index]
    const time = times[index] ?? null

    if ( age === "10-11" ) {
      rows.push( { gender, course, event, distance, stroke, age: "10", time } )
      rows.push( { gender, course, event, distance, stroke, age: "11", time } )
    } else {
      rows.push( { gender, course, event, distance, stroke, age, time } )
    }
  }
}

// Surrey County Age Group Championships 2027 qualifying times.
// Each row contains the long-course event and times followed by the same short-course event and times.
// The second page contains consideration times and is deliberately excluded because the application stores
// one general county threshold per gender/course/event/age.
export function parseSwimmingPdfLayout17( text: string ): ImportEvent[] {
  const qualifyingPage = text.split( /--\s*1\s+of\s+2\s*--/i )[0]
  const lines = qualifyingPage.split( "\n" ).map( line => line.trim() ).filter( Boolean )
  const rows: ImportEvent[] = []
  let gender: "male" | "female" | null = null

  for ( const line of lines ) {
    if ( /OPEN\s*\/\s*MALE County Qualifying Times/i.test( line ) ) {
      gender = "male"
      continue
    }
    if ( /FEMALE County Qualifying Times/i.test( line ) ) {
      gender = "female"
      continue
    }
    if ( !gender ) continue

    const matches = [ ...line.matchAll( eventPattern ) ]
    if ( matches.length !== 2 || matches[0].index === undefined || matches[1].index === undefined ) continue

    const [ longEvent, shortEvent ] = matches
    if ( longEvent[1] !== shortEvent[1] || longEvent[2].toLowerCase() !== shortEvent[2].toLowerCase() ) continue

    const longTimes = parseTimes( line.slice( longEvent.index + longEvent[0].length, shortEvent.index ).trim() )
    const shortTimes = parseTimes( line.slice( shortEvent.index + shortEvent[0].length ).trim() )
    if ( !longTimes || !shortTimes ) continue

    const distance = `${longEvent[1]}m`
    const stroke = /individual/i.test( longEvent[2] ) ? "Individual Medley" : longEvent[2]

    appendRows( rows, gender, "lc", distance, stroke, longTimes )
    appendRows( rows, gender, "sc", distance, stroke, shortTimes )
  }

  return rows
}
