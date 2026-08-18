import type { ImportEvent } from "../../types"

const ages = [ "10-11", "12", "13", "14", "15", "16", "17+" ] as const
const eventPattern = /^(50|100|200|400|800|1500)m\s+(Freestyle|Breaststroke|Butterfly|Backstroke|Ind\.\s*Med)\s+(.+)$/i
const valuePattern = /No Event|\d{1,2}(?:\.\d{2}){1,2}/gi

function normalizeLancashireTime( value: string ): string | null {
  if ( /^No Event$/i.test( value ) ) return null

  const minuteTime = /^(\d{1,2})\.(\d{2})\.(\d{2})$/.exec( value )
  return minuteTime ? `${minuteTime[1]}:${minuteTime[2]}.${minuteTime[3]}` : value
}

function appendRows(
  rows: ImportEvent[],
  gender: "male" | "female",
  distance: string,
  stroke: string,
  values: string[]
) {
  const event = `${stroke} ${distance}`

  ages.forEach( ( age, index ) => {
    const time = normalizeLancashireTime( values[index] )

    if ( age === "10-11" ) {
      rows.push( { gender, course: "sc", event, distance, stroke, age: "10", time } )
      rows.push( { gender, course: "sc", event, distance, stroke, age: "11", time } )
    } else {
      rows.push( { gender, course: "sc", event, distance, stroke, age, time } )
    }
  } )
}

// Lancashire County Age Groups and Championships 2027 consideration times.
// The PDF contains separate open/male and female short-course tables.
export function parseSwimmingPdfLayout22( text: string ): ImportEvent[] {
  const rows: ImportEvent[] = []
  let gender: "male" | "female" | null = null

  for ( const rawLine of text.split( "\n" ) ) {
    const line = rawLine.replace( /\s+/g, " " ).trim()

    if ( /^OPEN\s*\/\s*MALE\b/i.test( line ) ) {
      gender = "male"
      continue
    }
    if ( /^FEMALE\b/i.test( line ) ) {
      gender = "female"
      continue
    }
    if ( !gender ) continue

    const match = eventPattern.exec( line )
    if ( !match ) continue

    const values = match[3].match( valuePattern ) ?? []
    if ( values.length !== ages.length ) continue

    const distance = `${match[1]}m`
    const stroke = /^Ind/i.test( match[2] ) ? "Individual Medley" : match[2]
    appendRows( rows, gender, distance, stroke, values )
  }

  return rows
}
