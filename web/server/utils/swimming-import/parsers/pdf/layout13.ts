import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdfLayout13( text: string ) {
  type Gender = "male" | "female"

  const lines = text
    .split( "\n" )
    .map( ( l ) => l.replace( /\s{2,}/g, " " ).trim() )
    .filter( Boolean )

  const STROKE_TOKEN_RX = /(Free|Back|Breast|B\/Fly|IM)/g
  const DIST_TOKEN_RX = /(\d{2,4}m)/g

  const TIMES_RX =
    /(?:\d{1,2}\.\d{2}\.\d{2})|(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}\.\d{2}(?=(?:\d{1,2}(?:[.:])|\d{2,4}\s*m\b|\D|$)))/g

  const timesFrom = ( s: string ): string[] => s.match( TIMES_RX ) ?? []

  const normInline = ( s: string ) =>
    s.replace( /\bI\.\s*M\.?\b/gi, "IM" ).replace( /\bB\s*\/\s*Fly\b/gi, "B/Fly" )

  const deglueBoundary = ( s: string ) =>
    s.replace( /(\d{1,2}\.\d{2})(?=\d{2,4}\s*m\b)/g, "$1 " )

  const parseHeaderPair = ( i: number ) => {
    const strokeLine = normInline( lines[i] ).replace( /\s+/g, "" )
    const distLine = normInline( lines[i + 1] ).replace( /\s+/g, "" )
    const strokes = strokeLine.match( STROKE_TOKEN_RX ) ?? []
    const dists = distLine.match( DIST_TOKEN_RX ) ?? []
    return { strokes, dists, ok: strokes.length === dists.length && strokes.length >= 12 }
  }

  const isAgeLine = ( s: string ) =>
    /^\s*(?:10\/?11\s*yr?s?|10\/?11|1[2-6]\s*yr?s?|17\+\s*yr?)/i.test( s )

  const labelToAges = ( label: string ): string[] => {
    const l = label.toLowerCase()
    if ( /10\/?11/.test( l ) ) return [ "10", "11" ]
    if ( /17\+/.test( l ) ) return [ "17+" ]
    const m = l.match( /(1[2-6])\s*(?:yr?s?)?/ )
    return m ? [ m[1] ] : []
  }

  const canonicalStroke = ( s: string ) => {
    const v = s.trim().toLowerCase()
    if ( v === "free" ) return "Freestyle"
    if ( v === "back" ) return "Backstroke"
    if ( v === "breast" ) return "Breaststroke"
    if ( v === "im" ) return "Individual Medley"
    if ( v === "b/fly" ) return "Butterfly"
    return s.trim()
  }

  const out: ImportEvent[] = []
  let blockIndex = 0 // 0 = female, 1 = male

  for ( let i = 0; i < lines.length - 1; i++ ) {
    const { strokes, dists, ok } = parseHeaderPair( i )
    if ( !ok ) continue

    const cols = strokes.map( ( st, idx ) => {
      const strokeFull = canonicalStroke( st )
      const distance = dists[idx]
      return {
        stroke: strokeFull,
        distance,
        event: `${strokeFull} ${distance}`,
      }
    } )
    const numCols = cols.length

    const gender: Gender = blockIndex === 0 ? "female" : "male"
    blockIndex += 1

    let r = i + 2
    let agesParsed = 0

    while ( r < lines.length && agesParsed < 7 ) {
      let raw = normInline( lines[r] )
      if ( !isAgeLine( raw ) ) break

      raw = deglueBoundary( raw )

      const mAge = raw.match( /^\s*(?:10\/?11\s*yr?s?|10\/?11|1[2-6]\s*yr?s?|17\+\s*yr?)/i )
      const ageLabel = mAge ? mAge[0] : ""
      const ages = labelToAges( ageLabel )

      const tokens: ( string | null )[] = timesFrom( raw ).slice( 0, numCols )

      if ( tokens.length < numCols && r + 1 < lines.length ) {
        const nxt = normInline( lines[r + 1] )
        const nxtTimes = timesFrom( nxt )
        if ( nxtTimes.length && nxtTimes.join( "" ) === nxt.replace( /\s+/g, "" ) ) {
          tokens.push( ...nxtTimes )
          r += 1
        }
      }

      while ( tokens.length < numCols ) tokens.push( null )

      for ( let c = 0; c < numCols; c++ ) {
        const { stroke, distance, event } = cols[c]
        const t = tokens[c] ?? null
        for ( const a of ages ) {
          out.push( {
            gender,
            event,
            distance,
            stroke,
            age: a,
            time: normalizeTime( t ),
          } )
        }
      }

      agesParsed += 1
      r += 1
    }

    i = r - 1
  }

  return out
}
