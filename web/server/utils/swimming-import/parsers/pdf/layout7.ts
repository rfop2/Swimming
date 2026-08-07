import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

// Berkshire & South Buckinghamshire consideration times.
export function parseSwimmingPdfLayout7( text: string ): ImportEvent[] {
  const lines = text.split( "\n" ).map( line => line.trim() ).filter( Boolean )
  const ages = [ "10-11", "12", "13", "14", "15", "16", "17+" ] as const
  const structured: ImportEvent[] = []

  let gender: "female" | "male" | null = null

  // Allow an optional tail containing times on the event line.
  const eventPattern =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|(?:Ind(?:ividual)?\.?\s*Medley|IM))(?:\s+(.*))?$/i
  const eventPrefixPattern =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|(?:Ind(?:ividual)?\.?\s*Medley|IM))\b/i
  const timeTokenPattern = /\d{1,2}(?:[:.]\d{1,2}){1,2}/g
  const maleHeadingPattern = /^(OPEN\/MALE|OPEN\s*\/\s*MALE|MALE\/OPEN|MALE|OPEN)\b/i

  const expectedColumns = ( distance: string, stroke: string ) => {
    const isIndividualMedley = /Ind(?:ividual)?\.?\s*Medley|IM/i.test( stroke )
    if ( distance === "800m" || distance === "1500m" ) return 6
    if ( distance === "400m" && isIndividualMedley ) return 6
    return 7
  }

  const alignAgeColumns = ( distance: string, stroke: string, times: string[] ) => {
    const requiredColumns = expectedColumns( distance, stroke )
    const aligned: Array<string | null> = times.slice( 0, requiredColumns )
    if ( requiredColumns === 6 ) aligned.unshift( null )
    while ( aligned.length < ages.length ) aligned.push( null )
    return aligned
  }

  const pushRows = ( distance: string, rawStroke: string, tokens: string[] ) => {
    const stroke = /Ind(?:ividual)?\.?\s*Medley|IM/i.test( rawStroke )
      ? "Individual Medley"
      : rawStroke
    const event = `${stroke} ${distance}`
    const aligned = alignAgeColumns( distance, stroke, tokens )

    for ( let index = 0; index < ages.length; index++ ) {
      const age = ages[index]
      const rawTime = aligned[index]
      const time = rawTime ? normalizeTime( rawTime ) : null

      if ( age === "10-11" ) {
        structured.push( { gender, event, distance, stroke, age: "10", time } )
        structured.push( { gender, event, distance, stroke, age: "11", time } )
      } else {
        structured.push( { gender, event, distance, stroke, age, time } )
      }
    }
  }

  for ( let index = 0; index < lines.length; index++ ) {
    const line = lines[index]

    if ( /^FEMALE\b/i.test( line ) ) {
      gender = "female"
      continue
    }
    if ( maleHeadingPattern.test( line ) ) {
      gender = "male"
      continue
    }
    if ( !gender ) continue

    const eventMatch = eventPattern.exec( line )
    if ( !eventMatch ) continue

    const distance = `${eventMatch[1]}m`
    const stroke = eventMatch[2]
    const requiredColumns = expectedColumns( distance, stroke )
    let tokens: string[] = eventMatch[3]?.match( timeTokenPattern ) ?? []

    let nextLineIndex = index + 1
    while ( nextLineIndex < lines.length && tokens.length < requiredColumns ) {
      const nextLine = lines[nextLineIndex]
      if ( eventPrefixPattern.test( nextLine ) ) break
      if ( /^FEMALE\b/i.test( nextLine ) || maleHeadingPattern.test( nextLine ) ) break
      if ( /^Age\b/i.test( nextLine ) ) {
        nextLineIndex++
        continue
      }

      const additionalTokens = nextLine.match( timeTokenPattern ) ?? []
      if ( additionalTokens.length === 0 ) break

      tokens = tokens.concat( additionalTokens )
      nextLineIndex++
    }

    if ( tokens.length > 0 ) pushRows( distance, stroke, tokens )
  }

  return structured
}
