import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdfLayout9( text: string ) {
  type Gender = "female" | "male"

  const AGE_COLS = [ "10-11", "12", "13", "14", "15", "16", "17+" ] as const

  const EVENT_RX =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Fly|IM|Individual(?:\s+Medley)?)(?:\s+(.*))?$/i

  const TIME_RX =
    /(?:(?:\d{1,2}[:.])?\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)|(?:\d{1,2}[.]\d{2})/g

  const lines = text.split( "\n" ).map( s => s.trim() ).filter( Boolean )
  const structured: ImportEvent[] = []

  let gender: Gender | null = null

  // helpers
  const genderFrom = ( s: string ): Gender | null => {
    if ( /^FEMALE\b/i.test( s ) ) return "female"
    if ( /^(?:OPEN\s*\/\s*MALE|OPEN\/MALE|MALE|OPEN\s*MALE)\b/i.test( s ) ) return "male"
    return null
  }

  const timesFrom = ( s: string ) => ( s.match( TIME_RX ) || [] )

  const isPureTimes = ( s: string ) => {
    const t = timesFrom( s )
    return t.length > 0 && t.join( " " ) === s.replace( /\s+/g, " " )
  }

  const isMeta = ( s: string ) =>
    /Cornwall|County|Championship|Qualifying|Times|Age\s|Over|Notes/i.test( s )
    || /^-+$/.test( s )
    || s === "."

  const normStroke = ( raw: string ) => {
    if ( /^fly$/i.test( raw ) ) return "Butterfly"
    if ( /^im$/i.test( raw ) || /Individual\s+Medley/i.test( raw ) ) return "Individual Medley"
    return raw.replace( /\s+/g, " " )
  }

  const expectedCount = ( distance: string, stroke: string ) => {
    const d = `${distance}` // "50", "100", ..., "1500"
    const isIM = /Individual\s+Medley/i.test( stroke ) || /^IM$/i.test( stroke )
    if ( d === "800" || d === "1500" ) return 6 // 12..17+
    if ( d === "400" && isIM ) return 6
    return 7
  }

  const alignTo7 = (
    distance: string,
    stroke: string,
    tokens: string[]
  ): ( string | null )[] => {
    const need = expectedCount( distance, stroke )
    let arr: ( string | null )[] = tokens.slice( 0, need )
    if ( need === 6 ) arr = [ null, ...arr ]
    while ( arr.length < 7 ) arr.push( null )
    return arr
  }

  const pushEvent = ( gender: Gender, distanceNum: string, strokeRaw: string, tokens: string[] ) => {
    const stroke = normStroke( strokeRaw )
    const distance = `${distanceNum}m`
    const event = `${stroke} ${distance}`
    const aligned = alignTo7( distanceNum, stroke, tokens )

    for ( let i = 0; i < AGE_COLS.length; i++ ) {
      const label = AGE_COLS[i]
      const raw = aligned[i]
      const t = normalizeTime( raw )

      if ( label === "10-11" ) {
        structured.push( { gender, event, distance, stroke, age: "10", time: t } )
        structured.push( { gender, event, distance, stroke, age: "11", time: t } )
      } else {
        structured.push( { gender, event, distance, stroke, age: label, time: t } )
      }
    }
  }

  let pending: { distance: string, stroke: string, tokens: string[] } | null = null

  const flushPending = () => {
    if ( pending && gender ) {
      pushEvent( gender, pending.distance, pending.stroke, pending.tokens )
    }
    pending = null
  }

  for ( let i = 0; i < lines.length; i++ ) {
    const raw = lines[i]
    if ( !raw ) continue

    const g = genderFrom( raw )
    if ( g ) {
      flushPending()
      gender = g
      continue
    }

    if ( !gender ) continue
    if ( isMeta( raw ) ) continue

    const m = EVENT_RX.exec( raw )
    if ( m ) {
      flushPending()
      const [ , distNum, strokeRaw, tail = "" ] = m
      const distance = String( parseInt( distNum, 10 ) ) // "50"..."1500"
      const stroke = normStroke( strokeRaw )
      const need = expectedCount( distance, stroke )
      const tokens = timesFrom( tail )

      if ( tokens.length >= need ) {
        pushEvent( gender, distance, stroke, tokens.slice( 0, need ) )
      } else {
        pending = { distance, stroke, tokens: tokens.slice() }
      }
      continue
    }

    if ( pending && isPureTimes( raw ) ) {
      const distance = pending.distance
      const stroke = normStroke( pending.stroke )
      const need = expectedCount( distance, stroke )
      pending.tokens.push( ...timesFrom( raw ) )
      if ( pending.tokens.length >= need ) {
        pushEvent( gender, distance, stroke, pending.tokens.slice( 0, need ) )
        pending = null
      }
      continue
    }
  }

  flushPending()
  return structured
}

// Cornwall-County-Champs-2026-QTs
// time are taken from 50m Freestyle not consideration block
