import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdfLayout10( text: string ) {
  const lines = text.split( "\n" ).map( l => l.trim() ).filter( Boolean )

  type Gender = "female" | "male"

  // â€œAge Group 10&11 12 13 14 15 16 17& Overâ€
  // We always output: 10, 11, 12, 13, 14, 15, 16, 17+
  const AGE_SLOTS = [ "10-11", "12", "13", "14", "15", "16", "17+" ] as const

  // Gender headers
  const FEMALE_RX = /\b(FEMALE)\b/i
  const MALE_RX = /\b(MALE\/?OPEN|OPEN\/?MALE|MALE|MALE\s*\/\s*OPEN)\b/i

  // Event line. Example: "50m Freestyle", "400m Freestyle  06:40.00", "100m Fly ..."
  const EVENT_RX =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|(?:Butterfly|Fly)|(?:Ind(?:ividual)?\.?\s*Medley|IM))\*?\s*(.*)$/i

  // â€œConsiderationâ€ block begins here (may have times on same line OR on next lines)
  const CONSID_RX = /^Consideration\b/i

  // A single token can be:
  // - HH:MM:SS(.sss)
  // - MM:SS(.sss)
  // - SS.ss or SS.sss
  // Weâ€™ll tokenize by whitespace and test per token.
  const TIME_ATOM_RX =
    /^(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?|\d{1,2}:\d{2}(?:\.\d{1,3})?|\d{1,2}\.\d{2,3})$/

  // Placeholder tokens (e.g., xxxx, â€”, -). Treat as missing slot (null).
  const isPlaceholderToken = ( t: string ) =>
    /^x+$/i.test( t.replace( /[.:]/g, "" ) ) || t === "â€”" || t === "-"

  // A line that consists only of time/placeholder tokens (used to skip Consideration blocks)
  const isTimesOrPlaceholderLine = ( s: string ) => {
    const parts = s.split( /\s+/ ).filter( Boolean )
    if ( !parts.length ) return false
    return parts.every( p => TIME_ATOM_RX.test( p ) || isPlaceholderToken( p ) )
  }

  // Normalize stroke names
  const normStroke = ( s: string ) => {
    if ( /^fly$/i.test( s ) || /butterfly/i.test( s ) ) return "Butterfly"
    if ( /^im$/i.test( s ) || /ind(?:ividual)?\.?\s*medley/i.test( s ) ) return "Individual Medley"
    return s
  }

  // Tokenize a string into an ordered list of 0..7 columns including nulls for placeholders.
  function extractColsFromString( s: string, acc: ( string | null )[] ) {
    if ( !s ) return
    const parts = s.split( /\s+/ ).filter( Boolean )
    for ( const p of parts ) {
      if ( isPlaceholderToken( p ) ) acc.push( null )
      else if ( TIME_ATOM_RX.test( p ) ) acc.push( p )
      // else ignore non-time junk
      if ( acc.length >= 7 ) break
    }
  }

  // Emit rows for one event
  function pushAgeRows(
    out: ImportEvent[],
    gender: Gender,
    distance: string,
    stroke: string,
    cols: ( string | null )[]
  ) {
    const event = `${stroke} ${distance}`
    // Ensure exactly 7 slots
    while ( cols.length < 7 ) cols.push( null )

    for ( let i = 0; i < AGE_SLOTS.length; i++ ) {
      const slot = AGE_SLOTS[i]
      const val = normalizeTime( cols[i] )

      if ( slot === "10-11" ) {
        out.push( { gender, event, distance, stroke, age: "10", time: val } )
        out.push( { gender, event, distance, stroke, age: "11", time: val } )
      } else {
        out.push( { gender, event, distance, stroke, age: slot, time: val } )
      }
    }
  }

  const structured: ImportEvent[] = []
  let currentGender: Gender | null = null

  // Walk the lines
  for ( let i = 0; i < lines.length; i++ ) {
    const raw = lines[i]
    if ( !raw ) continue

    // Gender switches
    if ( MALE_RX.test( raw ) ) {
      currentGender = "male"
      continue
    }
    if ( FEMALE_RX.test( raw ) ) {
      currentGender = "female"
      continue
    }

    // Skip â€œAge Group â€¦â€ header line; itâ€™s informative only
    if ( /^Age\s*Group\b/i.test( raw ) ) continue

    // Match an event row
    const m = EVENT_RX.exec( raw )
    if ( !m ) continue

    // Default gender to male if not set yet (so UI shows something)
    if ( !currentGender ) currentGender = "male"

    const dist = `${m[1]}m`
    const stroke = normStroke( m[2] )
    const tail = ( m[3] || "" ).trim()

    // Collect up to 7 columns from tail + subsequent lines, stopping at "Consideration" or next header/event
    const cols: ( string | null )[] = []
    extractColsFromString( tail, cols )

    let j = i + 1

    while ( j < lines.length && cols.length < 7 ) {
      const ln = lines[j]

      // Stop accumulating if the â€œConsiderationâ€ section begins.
      if ( CONSID_RX.test( ln ) ) {
        // Skip the entire Consideration block (this line + any following time/placeholder lines)
        j += 1
        while ( j < lines.length && isTimesOrPlaceholderLine( lines[j] ) ) j += 1
        break
      }

      // Stop if the next event/gender/age header starts
      if ( EVENT_RX.test( ln ) || MALE_RX.test( ln ) || FEMALE_RX.test( ln ) || /^Age\s*Group\b/i.test( ln ) ) {
        break
      }

      // Otherwise, consume times from this line
      extractColsFromString( ln, cols )
      j += 1
    }

    // Emit rows for this event
    pushAgeRows( structured, currentGender, dist, stroke, cols )

    // Advance i to where we stopped scanning
    i = j - 1
  }

  return structured
}

// County Qualifying Times 2026
// Qualifying Times WCSA Championships 2026
