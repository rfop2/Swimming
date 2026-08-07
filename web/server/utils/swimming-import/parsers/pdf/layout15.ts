import type { ImportEvent } from "../../types"

const ageGroups = [ "10-11", "12", "13", "14", "15", "16", "17+" ] as const
const timePattern = /^\d{2}:\d{2}\.\d$/
const rowPattern = /^(.+?)\s+(50|100|200|400)\s+(Free|Back|Breast|Fly|IM)\s+(.+)$/

const strokeNames = {
  Free: "Freestyle",
  Back: "Backstroke",
  Breast: "Breaststroke",
  Fly: "Butterfly",
  IM: "Individual Medley",
} as const

function parseTimes( value: string ): Array<string | null> | null {
  const times = value.split( /\s+/ ).filter( Boolean )
  if ( !times.every( time => timePattern.test( time ) ) ) return null

  if ( times.length === ageGroups.length ) return times
  if ( times.length === ageGroups.length - 1 ) return [ null, ...times ]
  return null
}

function appendGenderRows(
  rows: ImportEvent[],
  gender: "female" | "male",
  distance: string,
  stroke: string,
  times: Array<string | null>
) {
  const event = `${stroke} ${distance}`

  for ( let index = 0; index < ageGroups.length; index++ ) {
    const age = ageGroups[index]
    const time = times[index] ?? null

    if ( age === "10-11" ) {
      rows.push( { gender, event, distance, stroke, age: "10", time } )
      rows.push( { gender, event, distance, stroke, age: "11", time } )
    } else {
      rows.push( { gender, event, distance, stroke, age, time } )
    }
  }
}

// Swim England Suffolk County Championship Qualifying Times 2027.
// Each extracted row is: seven female times, event, seven open/male times.
export function parseSwimmingPdfLayout15( text: string ): ImportEvent[] {
  const rows: ImportEvent[] = []
  const lines = text.split( "\n" ).map( line => line.trim() ).filter( Boolean )

  for ( const line of lines ) {
    const match = rowPattern.exec( line )
    if ( !match ) continue

    const femaleTimes = parseTimes( match[1] )
    const maleTimes = parseTimes( match[4] )
    if ( !femaleTimes || !maleTimes ) continue

    const distance = `${match[2]}m`
    const stroke = strokeNames[match[3] as keyof typeof strokeNames]

    appendGenderRows( rows, "female", distance, stroke, femaleTimes )
    appendGenderRows( rows, "male", distance, stroke, maleTimes )
  }

  return rows
}
