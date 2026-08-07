import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdfLayout11( text: string ) {
  const raw = text.split( "\n" )
  const lines = raw
    .map( s => s.replace( /\s{2,}/g, " " ).trim() )
    .filter( Boolean )

  const AGES = [ "10-11", "12", "13", "14", "15", "16", "17+" ] as const
  const used: boolean[] = new Array( lines.length ).fill( false )

  const EVENT_RX =
    /^(\d{2,4})m\s+(Freestyle|Free|Backstroke|Back|Breaststroke|Breast|Butterfly|Fly|(?:Ind(?:ividual)?\.?\s*Medley|IM))\b(?:\s+(.*))?$/i

  const EVENT_INLINE_RX =
    /^(.*?)(\d{2,4})m\s+(Freestyle|Free|Backstroke|Back|Breaststroke|Breast|Butterfly|Fly|(?:Ind(?:individual)?\.?\s*Medley|IM))\b(?:\s+(.*))?$/i

  const TIMES_RX =
    /(?:\d{1,2}\.\d{2}\.\d{2,3})|(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}\.\d{2}(?=(?:\d{1,2}(?:[.:])|\d{2,4}\s*m\b|$)))|(?:\d{1,2}\.\d{3})(?!\d)/g

  const isPureTimes = ( s: string ) => {
    const t = s.match( TIMES_RX ) ?? []
    return t.length > 0 && t.join( " " ) === s.replace( /\s+/g, " " )
  }

  const timesFrom = ( s: string ) => s.match( TIMES_RX ) ?? []

  const normalizeStroke = ( s: string ) => {
    const x = s.toLowerCase()
    if ( x.startsWith( "ind" ) || x === "im" ) return "Individual Medley"
    if ( x.startsWith( "free" ) ) return "Freestyle"
    if ( x.startsWith( "back" ) ) return "Backstroke"
    if ( x.startsWith( "breast" ) ) return "Breaststroke"
    if ( x.startsWith( "fly" ) ) return "Butterfly"
    return s
  }

  const needCount = ( distance: string, stroke: string ) => {
    const isIM = /Individual\s*Medley/i.test( stroke )
    if ( distance === "800m" || distance === "1500m" ) return 6 // 12..17+
    if ( distance === "400m" && isIM ) return 6 // 12..17+
    return 7 // 10/11..17+
  }

  const alignTo7 = ( distance: string, stroke: string, toks: string[] ) => {
    const need = needCount( distance, stroke )

    const arr: Array<string | null> = toks.slice( 0, need )

    if ( need === 6 ) {
      // pad missing 10/11
      arr.unshift( null )
    }

    while ( arr.length < 7 ) {
      arr.push( null )
    }

    return arr
  }

  const pushAgeRows = (
    out: ImportEvent[],
    gender: "female" | "male",
    distanceNum: string,
    strokeRaw: string,
    tokens: string[]
  ) => {
    const distance = `${distanceNum}m`
    const stroke = normalizeStroke( strokeRaw )
    const event = `${stroke} ${distance}`
    const aligned = alignTo7( distance, stroke, tokens )

    console.log(
      `[pushAgeRows] event=${event} gender=${gender} tokens_in=${tokens.length}`
    )

    for ( let i = 0; i < AGES.length; i++ ) {
      const label = AGES[i]
      const tt = normalizeTime( aligned[i] )

      if ( label === "10-11" ) {
        out.push( { gender, event, distance, stroke, age: "10", time: tt } )
        out.push( { gender, event, distance, stroke, age: "11", time: tt } )
      } else {
        out.push( { gender, event, distance, stroke, age: label, time: tt } )
      }
    }
  }

  const collectPrevTimes = ( idxEvt: number, need: number ) => {
    const tokens: string[] = []
    let i = idxEvt - 1

    while ( i >= 0 && !used[i] && isPureTimes( lines[i] ) && tokens.length < need ) {
      tokens.unshift( ...timesFrom( lines[i] ) )
      used[i] = true
      i--
    }

    return tokens.slice( 0, need )
  }

  const collectNextTimes = (
    idxEvt: number,
    need: number,
    tailFirst: string[]
  ) => {
    const tokens: string[] = [ ...tailFirst ]
    let i = idxEvt + 1

    while ( i < lines.length && !used[i] && isPureTimes( lines[i] ) && tokens.length < need ) {
      tokens.push( ...timesFrom( lines[i] ) )
      used[i] = true
      i++
    }

    return tokens.slice( 0, need )
  }

  let leftGender: "female" | "male" = "male"
  let rightGender: "female" | "male" = "female"

  for ( const s of lines ) {
    const L = s.toUpperCase()

    if ( /\b(FEMALE|WOMEN|GIRLS)\b.*\b(OPEN\/?MALE|MALE|MEN|BOYS)\b/.test( L ) ) {
      leftGender = "female"
      rightGender = "male"
      console.log( `[header] left=female right=male (from: "${s}")` )
      break
    }

    if ( /\b(OPEN\/?MALE|MALE|MEN|BOYS)\b.*\b(FEMALE|WOMEN|GIRLS)\b/.test( L ) ) {
      leftGender = "male"
      rightGender = "female"
      console.log( `[header] left=male right=female (from: "${s}")` )
      break
    }
  }

  const out: ImportEvent[] = []

  for ( let i = 0; i < lines.length; i++ ) {
    if ( used[i] ) continue
    const line = lines[i]

    const mi = EVENT_INLINE_RX.exec( line )

    if ( mi ) {
      used[i] = true

      const left = ( mi[1] || "" ).trim()
      const distNum = mi[2]
      const strokeRaw = mi[3]
      const right = ( mi[4] || "" ).trim()

      const distance = `${distNum}m`
      const stroke = normalizeStroke( strokeRaw )
      const need = needCount( distance, stroke )

      const leftTokens = timesFrom( left ).slice( -need )
      const rightTokens = timesFrom( right ).slice( 0, need )

      console.log(
        `[inline] ${stroke} ${distance} | leftTokens=${leftTokens.length} rightTokens=${rightTokens.length} need=${need}`
      )

      if ( leftTokens.length === need ) {
        pushAgeRows( out, leftGender, distNum, strokeRaw, leftTokens )
      } else {
        console.log(
          `[inline] left side insufficient (${leftTokens.length}/${need})`
        )
      }

      if ( rightTokens.length === need ) {
        pushAgeRows( out, rightGender, distNum, strokeRaw, rightTokens )
      } else {
        console.log(
          `[inline] right side insufficient (${rightTokens.length}/${need})`
        )
      }

      if ( leftTokens.length === 0 && rightTokens.length === 0 ) {
        used[i] = false
      } else {
        continue
      }
    }

    const m = EVENT_RX.exec( line )
    if ( !m ) continue

    used[i] = true

    const distNum = m[1]
    const strokeRaw = m[2]
    const tail = ( m[3] || "" ).trim()

    const distance = `${distNum}m`
    const stroke = normalizeStroke( strokeRaw )
    const need = needCount( distance, stroke )

    const maleTokens = collectPrevTimes( i, need )
    const tailTokens = timesFrom( tail )
    const femaleTokens = collectNextTimes( i, need, tailTokens )

    console.log(
      `[fallback] ${stroke} ${distance} | malePrev=${maleTokens.length} femaleNext=${femaleTokens.length} need=${need}`
    )

    if ( maleTokens.length > 0 ) {
      pushAgeRows( out, "male", distNum, strokeRaw, maleTokens )
    }
    if ( femaleTokens.length > 0 ) {
      pushAgeRows( out, "female", distNum, strokeRaw, femaleTokens )
    }
  }

  console.log( `[L11] structured size: ${out.length}` )
  return out
}

// County-Championship-QTs-2025-1
