import type { ImportEvent } from "../../types"

const ages = [ "10", "11", "12", "13", "14", "15", "16+" ] as const
const timePattern = /^\d{1,2}(?:(?::\d{2})?\.\d{2})$/
const rowPattern = /^(.+?)\s+(50|100|200|400|800|1500)m\s+(Freestyle|Breaststroke|Butterfly|Backstroke|Ind(?:ividual)?\s+Medley)\s+(.+)$/i

function parseTimes( value: string ): Array<string | null> | null {
  const times = value.split( /\s+/ ).filter( Boolean )
  if ( !times.every( time => timePattern.test( time ) ) ) return null

  if ( times.length === ages.length ) return times
  if ( times.length === ages.length - 2 ) return [ null, null, ...times ]
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
    rows.push( {
      gender,
      event,
      distance,
      stroke,
      age: ages[index],
      time: times[index] ?? null,
    } )
  }
}

// 2027 Leicestershire Age Groups and Championships entry times.
// Each extracted row is: seven male/open times, event, then seven female times.
// The 800m, 1500m and 400m IM rows start at age 12 and therefore contain five times.
export function parseSwimmingPdfLayout16( text: string ): ImportEvent[] {
  const rows: ImportEvent[] = []
  const lines = text.split( "\n" ).map( line => line.trim() ).filter( Boolean )

  for ( const line of lines ) {
    const match = rowPattern.exec( line )
    if ( !match ) continue

    const maleTimes = parseTimes( match[1] )
    const femaleTimes = parseTimes( match[4] )
    if ( !maleTimes || !femaleTimes ) continue

    const distance = `${match[2]}m`
    const stroke = /^ind/i.test( match[3] ) ? "Individual Medley" : match[3]

    appendRows( rows, "male", distance, stroke, maleTimes )
    appendRows( rows, "female", distance, stroke, femaleTimes )
  }

  return rows
}
