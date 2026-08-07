import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdfLayout8( text: string ) {
  const lines = text.split( "\n" ).map( s => s.trim() ).filter( Boolean )
  console.log( "[L8] total lines:", lines.length )

  type Gender = "female" | "male"
  type Course = "lc" | "sc"

  const AGE_COLS = [ "11y/12y", "13y", "14y", "15y", "16y", "17y", "18y+" ] as const

  const courseFrom = ( s: string ): Course | null =>
    /LONG\s*COURSE/i.test( s ) ? "lc" : ( /SHORT\s*COURSE/i.test( s ) ? "sc" : null )

  const EVENT_RX =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|(?:Ind(?:ividual)?\.?\s*Medley|IM))\s*(.*)$/i

  // HH:MM:SS(.sss) | MM:SS(.sss) | SS.xx | SS.xxx
  const TIME_RX =
    /(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}\.\d{2})|(?:\d{1,2}\.\d{3})/g

  const PURE_TIMES_RX = /^([0-9:.]+\s*)+$/
  const timesFrom = ( s: string ) => s.match( TIME_RX ) ?? []

  // FIX: match "QT CT QT CT ..." with whitespace/tabs between pairs
  const QTCT_RX = /^(?:QT\s*CT)(?:\s+QT\s*CT){1,}$/i

  const NEED_TOKENS = 14 // QT + CT for 7 age columns

  const normalizeAge = ( s: string ) =>
    s.replace( /\s+/g, "" )
      .replace( /y\+$/i, "+" )
      .replace( /y$/i, "" )

  const pushRows = (
    out: ImportEvent[] = [],
    gender: Gender,
    course: Course,
    strokeRaw: string,
    distanceNum: string,
    tokens: string[],
  ) => {
    const stroke = /Ind(?:ividual)?\.?\s*Medley|IM/i.test( strokeRaw ) ? "Individual Medley" : strokeRaw
    const distance = `${distanceNum}m`
    const event = `${stroke} ${distance}`

    // Even indices = QT
    const qt = Array.from( { length: 7 }, ( _, i ) => tokens[2 * i] ?? null )

    for ( let i = 0; i < AGE_COLS.length; i++ ) {
      const col = AGE_COLS[i]
      const qtT = normalizeTime( qt[i] )

      if ( col === "11y/12y" ) {
        out.push( { gender, course, event, distance, stroke, age: "11", time: qtT } )
        out.push( { gender, course, event, distance, stroke, age: "12", time: qtT } )
      } else {
        const age = normalizeAge( col )
        out.push( { gender, course, event, distance, stroke, age, time: qtT } )
      }
    }
  }

  const structured: ImportEvent[] = []

  let currentCourse: Course | null = null
  let currentGender: Gender | null = null
  let qtctCountInCourse = 0

  let pending: { distance: string, stroke: string, tokens: string[] } | null = null

  const flushPending = () => {
    if ( !pending || !currentCourse || !currentGender ) {
      pending = null
      return
    }
    const toks = pending.tokens.slice( 0, NEED_TOKENS )
    if ( toks.length === NEED_TOKENS ) {
      pushRows( structured, currentGender, currentCourse, pending.stroke, pending.distance, toks )
    }
    pending = null
  }

  for ( let i = 0; i < lines.length; i++ ) {
    const line = lines[i]
    if ( !line ) continue

    // Course header
    const c = courseFrom( line )
    if ( c ) {
      flushPending()
      currentCourse = c
      currentGender = null
      qtctCountInCourse = 0
      console.log( `[${i}] course -> ${currentCourse}` )
      continue
    }

    // QT/CT header â‡’ sets gender by position within the course
    if ( QTCT_RX.test( line ) ) {
      flushPending()
      if ( !currentCourse ) {
        continue
      }
      qtctCountInCourse += 1
      currentGender = ( qtctCountInCourse === 1 ? "male" : "female" )
      continue
    }

    if ( !currentCourse || !currentGender ) {
      // Waiting for course + first QT/CT header
      continue
    }

    // Event row
    const m = EVENT_RX.exec( line )
    if ( m ) {
      flushPending()

      const [ , distanceNum, stroke, tail ] = m
      const tokens: string[] = timesFrom( tail || "" )
      console.log( `[${i}] event -> ${stroke} ${distanceNum}m | inline=${tokens.length}` )

      if ( tokens.length < NEED_TOKENS ) {
        let j = i + 1
        while ( j < lines.length && tokens.length < NEED_TOKENS ) {
          const nxt = lines[j]
          if ( PURE_TIMES_RX.test( nxt ) ) {
            const more = timesFrom( nxt )
            if ( more.length === 0 ) break
            tokens.push( ...more )
            j++
            i = j - 1
          } else if ( QTCT_RX.test( nxt ) || courseFrom( nxt ) ) {
            // New gender section or new course
            break
          } else {
            // Any other non-times line ends the gather
            break
          }
        }
      }

      if ( tokens.length === NEED_TOKENS ) {
        pushRows( structured, currentGender, currentCourse, stroke, distanceNum, tokens )
      } else {
        // Keep behavior symmetrical with pending path
        console.log( `[${i}] collected ${tokens.length}/${NEED_TOKENS} tokens -> skip` )
      }
      continue
    }

    // Skip other headers/noise
    if ( /^(11y\/?12y|Age|Notes|QUALIFYING|CONSIDERATION|FEMALE|OPEN\/?MALE|--\s*\d+\s*of\s*\d+\s*--)/i.test( line ) ) {
      flushPending()
      continue
    }
  }

  flushPending()
  return structured
}

// cornwall-county-championships-2025-qts_057406
