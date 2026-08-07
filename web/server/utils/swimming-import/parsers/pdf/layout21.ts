import type { ImportEvent } from "../../types"

const ages = [ "10-11", "12", "13", "14", "15", "16+" ] as const
const eventPattern = /^(50|100|200|400|800|1500)\s+(Free|Breast|Fly|Back|IM)\b/i
const timePattern = /\d{1,2}:\d{2}\.\d/g

const strokeNames: Record<string, string> = {
  free: "Freestyle",
  breast: "Breaststroke",
  fly: "Butterfly",
  back: "Backstroke",
  im: "Individual Medley",
}

const excludesTenAndEleven = ( distance: string, stroke: string ) =>
  distance === "800m" || distance === "1500m" || ( distance === "400m" && stroke === "Individual Medley" )

export function parseSwimmingPdfLayout21( text: string ): ImportEvent[] {
  const rows: ImportEvent[] = []

  for ( const rawLine of text.split( "\n" ) ) {
    const line = rawLine.replace( /\s+/g, " " ).trim()
    const eventMatch = eventPattern.exec( line )
    if ( !eventMatch ) continue

    const distance = `${eventMatch[1]}m`
    const stroke = strokeNames[eventMatch[2].toLowerCase()]
    if ( !stroke ) continue

    const noYoungestTimes = excludesTenAndEleven( distance, stroke )
    const times = line.match( timePattern ) ?? []
    const timesPerGender = noYoungestTimes ? 5 : 6
    if ( times.length !== timesPerGender * 2 ) continue

    const genderTimes = {
      male: times.slice( 0, timesPerGender ),
      female: times.slice( timesPerGender ),
    }
    const event = `${stroke} ${distance}`

    for ( const gender of [ "male", "female" ] as const ) {
      const alignedTimes: Array<string | null> = noYoungestTimes
        ? [ null, ...genderTimes[gender] ]
        : genderTimes[gender]

      ages.forEach( ( age, index ) => {
        const time = alignedTimes[index] ?? null
        if ( age === "10-11" ) {
          rows.push( { gender, course: "sc", event, distance, stroke, age: "10", time } )
          rows.push( { gender, course: "sc", event, distance, stroke, age: "11", time } )
        } else {
          rows.push( { gender, course: "sc", event, distance, stroke, age, time } )
        }
      } )
    }
  }

  return rows
}
