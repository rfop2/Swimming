import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdfLayout12( text: string ) {
  const lines = text.split( "\n" ).map( l => l.replace( /\s{2,}/g, " " ).trim() ).filter( Boolean )

  // Ages: top bucket stored as "16" (no plus)
  const AGES = [ "10", "11", "12", "13", "14", "15", "16" ] as const

  // How many events belong to the first course (LC). Remaining events are SC.
  const LC_EVENT_COUNT = 17

  // Times: supports 1.31.10 / 01:31.10 / 59.66 / 1:02.345 / 1.02.345
  const TIMES_RX =
    /(?:\d{1,2}\.\d{2}\.\d{2})|(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}\.\d{2}(?=(?:\s|$)))|(?:\d{1,2}\.\d{3})(?!\d)/g

  const timesFrom = ( s: string ) => s.match( TIMES_RX ) ?? []

  const isTimesOnly = ( s: string ) =>
    /^[\d:.\s]+$/.test( s ) && ( timesFrom( s ).join( " " ) === s.replace( /\s+/g, " " ) )

  const strokeCanonical = ( s: string ) => {
    const x = s.toLowerCase()
    if ( x.startsWith( "ind" ) || x === "im" || /i\.?\s*m\.?/i.test( s ) ) return "Individual Medley"
    if ( x.startsWith( "free" ) ) return "Freestyle"
    if ( x.startsWith( "back" ) ) return "Backstroke"
    if ( x.startsWith( "breast" ) ) return "Breaststroke"
    if ( x.startsWith( "fly" ) || x.startsWith( "butter" ) ) return "Butterfly"
    return s
  }

  // columns per side (per gender) needed for this event
  const needByEvent = ( distance: string, stroke: string ) => {
    const d = distance.replace( /m$/i, "" )
    const isIM = /medley/i.test( stroke )
    if ( d === "800" || d === "1500" ) return 5 // 12..16
    if ( d === "400" && isIM ) return 5 // 12..16
    return 7 // 10..16
  }

  // Align tokens to ages 10..16. Shift when there are only 5 (or 6) columns.
  const alignTo7 = ( distance: string, stroke: string, tokens: string[] ) => {
    const need = needByEvent( distance, stroke )
    const picked = tokens.slice( 0, need )
    const out: ( string | null )[] = Array( 7 ).fill( null )
    if ( need === 7 ) { // 10..16
      for ( let i = 0; i < 7; i++ ) out[i] = picked[i] ?? null
    } else if ( need === 6 ) { // 11..16
      for ( let i = 0; i < 6; i++ ) out[i + 1] = picked[i] ?? null
    } else { // 12..16  (need === 5)
      for ( let i = 0; i < 5; i++ ) out[i + 2] = picked[i] ?? null
    }
    return out
  }

  // Event anywhere on the line; accept optional "m" (handles "800 Free" too).
  // Groups: 1=left segment, 2=distance, 3=stroke, 4=right segment
  const EVENT_INLINE_RX =
    /^(.*?)(?<!\d)(\d{2,4})\s*m?\b\s+(Freestyle|Free|Backstroke|Back|Breaststroke|Breast|Butterfly|Fly|I\.?\s*M\.?|IM|Ind(?:ividual)?\.?\s*Medley)\b(.*)$/i

  const out: ImportEvent[] = []
  let eventIndex = 0 // 0.. -> first LC_EVENT_COUNT events = lc, others = sc

  const pushSide = (
    course: "lc" | "sc",
    gender: "male" | "female",
    distanceNum: string,
    strokeRaw: string,
    tokens: string[]
  ) => {
    const distance = `${distanceNum}m`
    const stroke = strokeCanonical( strokeRaw )
    const event = `${stroke} ${distance}`
    const aligned = alignTo7( distance, stroke, tokens )
    console.log( `[push] ${event} | course=${course} | gender=${gender} | tokens=${tokens.length} | need=${needByEvent( distance, stroke )}` )

    for ( let i = 0; i < AGES.length; i++ ) {
      const age = AGES[i] // top bucket stored as "16"
      const t = normalizeTime( aligned[i] )
      out.push( { gender, course, event, distance, stroke, age, time: t } )
    }
  }

  for ( let i = 0; i < lines.length; i++ ) {
    const raw = lines[i]
    if ( !raw
      || /^(Produced by|Events|No event|All entries|License numbers|Galaentries@|Please be aware|Female Qualifying Times|Open\/Male Qualifying Times|Short course equivalent times)$/i.test( raw )
      || /(Born|yrs|earlier)/i.test( raw )
      || /^\d{4}(?:\s+\d{4})?$/.test( raw ) ) {
      continue
    }

    // Normalize "I.M." to "IM" to simplify stroke detection
    const line = raw.replace( /\bI\.\s*M\.?/gi, "IM" )

    const m = EVENT_INLINE_RX.exec( line )
    if ( !m ) continue

    const leftSeg = ( m[1] || "" ).trim()
    const distNum = m[2]
    const strokeRx = m[3]
    const rightSeg = ( m[4] || "" ).trim()

    const distance = `${distNum}m`
    const stroke = strokeCanonical( strokeRx )
    const need = needByEvent( distance, stroke )
    const course: "lc" | "sc" = ( eventIndex < LC_EVENT_COUNT ) ? "lc" : "sc"

    // Left tokens (male): take LAST 'need' tokens before the event.
    const leftTokens = timesFrom( leftSeg ).slice( -need )

    // Right tokens (female): FIRST 'need' tokens after the event, possibly spanning pure-times continuation lines.
    let rightTokens = timesFrom( rightSeg )
    let j = i + 1
    while ( rightTokens.length < need && j < lines.length && isTimesOnly( lines[j] ) ) {
      rightTokens = rightTokens.concat( timesFrom( lines[j] ) )
      j++
    }
    rightTokens = rightTokens.slice( 0, need )

    console.log( `[event] ${stroke} ${distance} | eventIndex=${eventIndex} -> course=${course} | left=${leftTokens.length}/${need} right=${rightTokens.length}/${need}` )

    if ( leftTokens.length === need ) pushSide( course, "male", distNum, strokeRx, leftTokens )
    if ( rightTokens.length === need ) pushSide( course, "female", distNum, strokeRx, rightTokens )

    // advance to after any continuation lines we consumed
    i = j - 1
    eventIndex += 1
  }

  console.log( `[L12] structured size: ${out.length} | events parsed: ${eventIndex}` )
  return out
}

// 2026 - Wiltshire County
