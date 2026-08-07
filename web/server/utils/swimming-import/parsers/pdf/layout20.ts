import type { ImportEvent } from "../../types"

const ages = [ "10-11", "12", "13", "14", "15", "16+" ] as const
const eventPattern = /^(50|100|200|400|800|1500)m\s+(Free|Breast|Fly|Back|IM)\s+(.+)$/i
const timePattern = /(?:\d{1,2}:)?\d{1,2}\.\d{2}|\b0\b/g

const strokeNames: Record<string, string> = {
  free: "Freestyle",
  breast: "Breaststroke",
  fly: "Butterfly",
  back: "Backstroke",
  im: "Individual Medley",
}

const excludesTenAndEleven = ( distance: string, stroke: string ) =>
  distance === "800m" || distance === "1500m" || ( distance === "400m" && stroke === "Individual Medley" )

// Hertfordshire 2027 contains QT and CT side by side. The application stores one threshold for each
// gender/event/age, so this parser deliberately imports only the qualifying-time (QT) columns.
export function parseSwimmingPdfLayout20( text: string ): ImportEvent[] {
  const rows: ImportEvent[] = []
  let gender: "male" | "female" | null = null
  let tableIndex = 0

  for ( const rawLine of text.split( "\n" ) ) {
    const line = rawLine.replace( /\s+/g, " " ).trim()
    if ( /^(?:QT\s+CT\s*){6}$/i.test( line ) ) {
      tableIndex++
      gender = tableIndex === 1 ? "male" : tableIndex === 2 ? "female" : null
      continue
    }
    if ( /^OPEN$/i.test( line ) ) {
      if ( tableIndex === 0 ) gender = "male"
      continue
    }
    if ( /^FEMALE$/i.test( line ) ) {
      if ( tableIndex === 0 ) gender = "female"
      continue
    }
    if ( !gender ) continue

    const match = eventPattern.exec( line )
    if ( !match ) continue

    const distance = `${match[1]}m`
    const stroke = strokeNames[match[2].toLowerCase()]
    if ( !stroke ) continue

    const noYoungestTimes = excludesTenAndEleven( distance, stroke )
    const tokens = match[3].match( timePattern ) ?? []
    const pairedTimes = noYoungestTimes ? tokens.slice( -10 ) : tokens.slice( -12 )
    if ( pairedTimes.length !== ( noYoungestTimes ? 10 : 12 ) ) continue

    const qualifyingTimes = pairedTimes.filter( ( _, index ) => index % 2 === 0 )
    const alignedTimes: Array<string | null> = noYoungestTimes
      ? [ null, ...qualifyingTimes ]
      : qualifyingTimes
    const event = `${stroke} ${distance}`

    ages.forEach( ( age, index ) => {
      const time = alignedTimes[index] ?? null
      if ( age === "10-11" ) {
        rows.push( { gender, event, distance, stroke, age: "10", time } )
        rows.push( { gender, event, distance, stroke, age: "11", time } )
      } else {
        rows.push( { gender, event, distance, stroke, age, time } )
      }
    } )
  }

  return rows
}
