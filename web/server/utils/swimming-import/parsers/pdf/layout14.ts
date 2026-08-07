import type { ImportEvent } from "../../types"

// Swim England Norfolk County Championships 2027 - long-course qualifying times.
export function parseSwimmingPdfLayout14( text: string ): ImportEvent[] {
  const lines = text.split( "\n" ).map( line => line.trim() ).filter( Boolean )
  const ages = [ "10-11", "12", "13", "14", "15", "16", "17+" ] as const
  const rows: ImportEvent[] = []
  const eventPattern = /^(\d{2,4}m)\s+(Freestyle|Breaststroke|Butterfly|Backstroke|IM|Medley)\s+(.+)$/i
  const timePattern = /^\d{1,2}(?:(?::\d{2})?\.\d{2})$/

  let gender: "male" | "female" | null = null

  for ( const line of lines ) {
    if ( /^Open\s*\/\s*Male\s+Long Course QT$/i.test( line ) ) {
      gender = "male"
      continue
    }
    if ( /^Female\s+Long Course QT$/i.test( line ) ) {
      gender = "female"
      continue
    }
    if ( !gender ) continue

    const eventMatch = eventPattern.exec( line )
    if ( !eventMatch ) continue

    const distance = eventMatch[1]
    const rawStroke = eventMatch[2]
    const stroke = /^(IM|Medley)$/i.test( rawStroke ) ? "Individual Medley" : rawStroke
    const values = eventMatch[3].split( /\s+/ ).filter( Boolean )
    if ( values.length !== ages.length ) continue

    const event = `${stroke} ${distance}`
    for ( let index = 0; index < ages.length; index++ ) {
      const age = ages[index]
      const rawTime = values[index]
      const time = timePattern.test( rawTime ) ? rawTime : null

      if ( age === "10-11" ) {
        rows.push( { gender, event, distance, stroke, age: "10", time } )
        rows.push( { gender, event, distance, stroke, age: "11", time } )
      } else {
        rows.push( { gender, event, distance, stroke, age, time } )
      }
    }
  }

  return rows
}
