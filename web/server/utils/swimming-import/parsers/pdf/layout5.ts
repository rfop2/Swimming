import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdfLayout5( text: string ) {
  const lines = text.split( "\n" )
  console.log( "[L5] total lines:", lines.length )

  const AGE_COLS = [ "10-11", "12", "13", "14", "15", "16", "17" ]
  const course = "sc" as const
  const structured: ImportEvent[] = []

  let gender: "female" | "male" | null = null

  // e.g. "200m Individual Medley ..." or "50m Freestyle ..."
  const EVENT_RX =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Individual\s+Medley)(?:\s+(.*))?$/i

  // Accept "1:07.22", "00:36.68", "59.66" (no colon), or "05:09.93"
  const TIME_RX = /^(?:(?:\d{1,2}:)?\d{2}|\d{1,2})(?:\.\d{2})?$/

  const isMeta = ( s: string ) =>
    /\bYears\b/i.test( s )
    || /\bAccepted\b/i.test( s )
    || /\bConsidered\b/i.test( s )
    || /SHORT\s*COURSE/i.test( s )
    || /^Ages are/i.test( s )
    || /^v\d/i.test( s )
    || /^County/i.test( s )
    || /^OXFORDSHIRE/i.test( s )
    || /^Affiliated/i.test( s )
    || /^\(?Under/i.test( s )
    || /^--\s*\d+\s*of\s*\d+\s*--$/i

  // ---------- YOUR SNIPPET (adapted) ----------
  // Detect if it's an age-columns header
  const isYearsHeader = ( line: string ) =>
    /\b(10\/11\s*Years|12\s*Years|13\s*Years|14\s*Years|15\s*Years|16\s*Years|17\+\s*Years)\b/i.test( line )

  // Extract gender from the header
  function getGenderFromHeader( line: string ): "female" | "male" | null {
    const s = line.toUpperCase()

    // Female first
    if ( /\b(FEMALE|WOMEN|GIRLS)\b/.test( s ) ) return "female"

    // Male (covers "OPEN/MALE" and variants)
    if ( /\b(OPEN\/MALE|MALE\/OPEN|MALE|MEN|BOYS)\b/.test( s ) ) return "male"

    return null // undefined
  }
  // -------------------------------------------

  const timesFrom = ( s: string ) => s.split( /\s+/ ).filter( ( t ) => TIME_RX.test( t ) || /^n\/a$/i.test( t ) )

  const normalize = ( t: string | null ) => {
    if ( !t ) return null
    const s = t.trim()
    if ( !s || /^n\/a$/i.test( s ) ) return null
    return typeof normalizeTime === "function" ? normalizeTime( s ) : s
  }

  const expectedCount = ( distance: string, stroke: string ) => {
    if ( distance === "800m" || distance === "1500m" ) return 6 // no 10/11
    if ( distance === "400m" && /Individual\s+Medley/i.test( stroke ) ) return 6 // 400 IM
    return 7
  }

  const pushRow = ( distance: string, stroke: string, acceptedTimes: ( string | null )[] ) => {
    let aligned: ( string | null )[]
    if ( acceptedTimes.length >= 7 ) aligned = acceptedTimes.slice( 0, 7 )
    else if ( acceptedTimes.length === 6 ) aligned = [ null, ...acceptedTimes ] // missing 10/11
    else aligned = Array( 7 - acceptedTimes.length ).fill( null ).concat( acceptedTimes )

    const event = `${stroke} ${distance}`
    console.log( `[pushRow] ${event} | accepted=${acceptedTimes.length} -> aligned=${aligned.length}` )

    for ( let i = 0; i < AGE_COLS.length; i++ ) {
      const label = AGE_COLS[i]
      const t = normalize( aligned[i] ?? null )

      if ( label === "10-11" ) {
        structured.push( { gender, course, event, distance, stroke, age: "10", time: t } )
        structured.push( { gender, course, event, distance, stroke, age: "11", time: t } )
      } else if ( label === "17" ) {
        structured.push( { gender, course, event, distance, stroke, age: "17+", time: t } )
      } else {
        structured.push( { gender, course, event, distance, stroke, age: label, time: t } )
      }
    }
  }

  type Pending = { distance: string, stroke: string, tokens: string[], inline: boolean }
  let pending: Pending | null = null

  const finalizePending = ( ) => {
    if ( !pending ) {
      return
    }

    if ( !gender ) {
      pending = null
      return
    }

    const N = expectedCount( pending.distance, pending.stroke )
    let accepted: string[]
    if ( pending.inline ) {
      accepted =
        pending.tokens.length >= N * 2
          ? pending.tokens.filter( ( _, i ) => i % 2 === 0 ).slice( 0, N )
          : pending.tokens.slice( 0, N )
    } else {
      accepted = pending.tokens.slice( 0, N )
    }

    pushRow( pending.distance, pending.stroke, accepted )
    pending = null
  }

  for ( let i = 0; i < lines.length; i++ ) {
    const raw = lines[i]
    console.log( `[${i}] RAW:`, raw )
    const line = raw.replace( /\s{2,}/g, " " ).trim()
    console.log( `[isMeta-debug] line="${line}"`, {
      Years: /\bYears\b/i.test( line ),
      Accepted: /\bAccepted\b/i.test( line ),
      Considered: /\bConsidered\b/i.test( line ),
      ShortCourse: /SHORT\s*COURSE/i.test( line ),
      Ages: /^Ages are/i.test( line ),
      Version: /^v\d/i.test( line ),
      County: /^County/i.test( line ),
      OX: /^OXFORDSHIRE/i.test( line ),
      Aff: /^Affiliated/i.test( line ),
      Under: /^\(?Under/i.test( line ),
      Page: /^--\s*\d+\s*of\s*\d+\s*--$/i.test( line ),
    } )

    if ( !line ) {
      console.log( `[${i}] empty -> skip` )
      continue
    }

    // 1) DETECT EVENT FIRST (before any meta filters)
    const m = EVENT_RX.exec( line )
    console.log(
      `[${i}] EVENT_RX match?`,
      !!m,
      m ? { distance: m[1], stroke: m[2], tailPreview: ( m[3] || "" ).slice( 0, 50 ) } : null
    )

    if ( m ) {
      if ( !gender ) {
        gender = "female" // default if not set yet
      }
      finalizePending( "new event" )

      const distance = `${m[1]}m`
      const stroke = m[2].replace( /\s+/g, " " ) === "Individual Medley" ? "Individual Medley" : m[2]
      const inlineTokens = m[3] ? timesFrom( m[3] ) : []
      if ( inlineTokens.length ) console.log( `[${i}] inlineTokens:`, inlineTokens )

      pending = { distance, stroke, tokens: inlineTokens, inline: inlineTokens.length > 0 }
      if ( pending.inline ) finalizePending( "inline event (immediate)" )
      continue // do not fall-through
    }

    // 1.5) YEARS HEADER / GENDER FROM HEADER (must be BEFORE gender blocks and BEFORE isMeta)
    if ( isYearsHeader( line ) ) {
      const newGender = getGenderFromHeader( line )
      if ( newGender ) {
        if ( gender && gender !== newGender ) {
          finalizePending( "gender switch -> YEARS header" )
        }
        gender = newGender
      }
      continue
    }

    // 2) THEN other headers/meta that switch gender
    if ( /^FEMALE$/i.test( line ) ) {
      finalizePending( "gender switch -> FEMALE" )
      gender = "female"
      continue
    }
    if ( /^(OPEN\s*\/\s*MALE|MALE\s*\/\s*OPEN|OPEN\/MALE|MALE\/OPEN|OPEN|MALE)$/i.test( line ) ) {
      finalizePending( "gender switch -> MALE" )
      gender = "male"
      continue
    }

    // 2.5) META (keep AFTER years-header so it doesn't swallow the header)
    if ( isMeta( line ) ) {
      continue
    }

    // 3) Pure time lines extending the previous event
    if ( pending ) {
      const tokens = timesFrom( line )
      const only = tokens.length > 0 && tokens.every( ( t ) => TIME_RX.test( t ) || /^n\/a$/i.test( t ) )
      if ( only ) {
        pending.tokens.push( ...tokens )
        continue
      }
    }
  }

  finalizePending( "end of file" )

  return structured
}

// 2026-CQTs
