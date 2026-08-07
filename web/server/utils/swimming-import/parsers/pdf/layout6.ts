import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdfLayout6( text: string ) {
  const lines = text.split( "\n" ).map( l => l.trim() ).filter( Boolean )

  const AGES8 = [ "10-11", "12", "13", "14", "15", "16", "17", "18+" ]
  const structured: ImportEvent[] = []

  let gender: "female" | "male" | null = null
  let eventHeaderCount = 0

  const EVENT_RX = /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Individual\s*Medley)\s*(.*)$/i
  // capta "38.00", "1:28.00", "1.28.00", "05:16.00", "3.27.00" etc.
  const TIME_TOKEN_RX = /(?:(?:\d{1,2}[:.]){2}\d{2})|(?:\d{1,2}[:.]\d{2})/g

  const isEventHeader = ( s: string ) => /^EVENT\s*10\/?11/i.test( s.replace( /\s+/g, "" ) )
  const isMeta = ( s: string ) =>
    /Qualifying Times/i.test( s )
    || /Somerset ASA/i.test( s )
    || /FEMALE\s*2026/i.test( s )
    || /OPEN\s*\/\s*MALE\s*2026/i.test( s )
    || /^\.?$/.test( s )

  const extractTimes = ( s: string ): string[] => s.match( TIME_TOKEN_RX ) ?? []

  const expectedCount = ( distance: string, stroke: string ) => {
    const isIM = /Individual\s*Medley/i.test( stroke )
    if ( distance === "800m" || distance === "1500m" ) return 7
    if ( distance === "400m" && isIM ) return 7
    return 8
  }

  const alignTo8 = ( times: ( string | null )[], distance: string, stroke: string ) => {
    const need = expectedCount( distance, stroke )
    let arr = times.slice( 0, need )

    if ( need === 7 ) {
      arr = [ null, ...arr ]
    }

    if ( arr.length < 8 ) arr = arr.concat( Array( 8 - arr.length ).fill( null ) )

    // garante 8 posiÃ§Ãµes
    return arr.slice( 0, 8 )
  }

  const pushStructured = ( distance: string, stroke: string, times: string[] ) => {
    const event = `${stroke} ${distance}`
    const aligned8 = alignTo8( times, distance, stroke ) // 8 pos

    for ( let i = 0; i < AGES8.length; i++ ) {
      const label = AGES8[i]
      const raw = aligned8[i] ?? null
      const t = normalizeTime( raw )

      if ( label === "10-11" ) {
        structured.push( { gender, event, distance, stroke, age: "10", time: t } )
        structured.push( { gender, event, distance, stroke, age: "11", time: t } )
      } else {
        structured.push( { gender, event, distance, stroke, age: label, time: t } )
      }
    }
  }

  for ( const raw of lines ) {
    if ( !raw ) continue

    if ( isEventHeader( raw ) ) {
      eventHeaderCount += 1
      gender = eventHeaderCount === 1 ? "female" : "male"
      continue
    }

    if ( !gender ) continue
    if ( isMeta( raw ) ) continue

    const m = EVENT_RX.exec( raw )
    if ( !m ) continue

    const distance = `${m[1]}m`
    const stroke = /Individual\s*Medley/i.test( m[2] ) ? "Individual Medley" : m[2]
    const tail = m[3] || ""

    const times = extractTimes( tail )
    if ( times.length === 0 ) continue

    pushStructured( distance, stroke, times )
  }

  return structured
}

// consideration-and-qualifying-times-v0-2--london-regional-summer-champs-2025_055780
// only QT times
