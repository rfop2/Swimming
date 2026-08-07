import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

type Gender = "male" | "female"

interface AgeTime {
  age: string
  time: string | null
}

interface Layout3Event {
  gender: Gender | null
  event: string
  distance: string
  stroke: string
  times: AgeTime[]
}

export function parseSwimmingPdfLayout3( text: string ) {
  const ages = [ "10/11", "12", "13", "14", "15", "16", "17/OV" ]
  const rawLines = text.split( "\n" ).map( l => l.trim() ).filter( Boolean )

  const events: Layout3Event[] = []
  let currentGender: "male" | "female" | null = null
  let currentStroke: string | null = null

  const strokes = [ "FREESTYLE", "BREASTSTROKE", "BUTTERFLY", "BACKSTROKE", "IND MEDLEY" ]

  // times like 43.38, 1:34.75 ou 1.34.75
  const isTime = ( t: string ) => /^\d+(?:\.\d+){1,2}$/.test( t )

  for ( const line of rawLines ) {
    if ( /\bFEMALE\b/i.test( line ) ) {
      currentGender = "female"
      continue
    }

    if ( /\bMALE\b/i.test( line ) || /\bMALE\b/i.test( line ) ) {
      currentGender = "male"
      continue
    }

    // ignore headers
    if ( /^(?:DORSET|CONSIDERATION|Ï†Ï„Ï†|^\d{1,2}$)/i.test( line ) ) continue

    const parts = line.split( /\s+/ )

    // stroke detection
    const firstTwo = parts.slice( 0, 2 ).join( " " ).toUpperCase()
    const firstOne = parts[0].toUpperCase()

    if ( strokes.includes( firstTwo ) ) {
      currentStroke = firstTwo
      parts.splice( 0, 2 ) // remove stroke
    } else if ( strokes.includes( firstOne ) ) {
      currentStroke = firstOne
      parts.splice( 0, 1 )
    }

    // Distance (50m, 100m, 200m, etc.)
    const distanceIdx = parts.findIndex( p => /^\d{1,4}m$/i.test( p.replace( /\s+/g, "" ) ) )
    if ( distanceIdx === -1 ) continue

    const distance = parts[distanceIdx].replace( /\s+/g, "" )
    const timesRaw = parts.slice( distanceIdx + 1 ).map( t => ( isTime( t ) ? t : null ) )

    // Check for nulls
    const missing = Math.max( 0, ages.length - timesRaw.length )
    const filledTimes = [ ...timesRaw, ...Array( missing ).fill( null ) ].slice( 0, ages.length )

    events.push( {
      gender: currentGender,
      event: `${distance} ${currentStroke}`,
      distance,
      stroke: currentStroke,
      times: ages.map( ( age, idx ) => ( { age, time: filledTimes[idx] } ) )
    } )
  }

  return normalizeLayout3( events )
}

export function normalizeLayout3( events: Layout3Event[] ): ImportEvent[] {
  const normalized: ImportEvent[] = []

  events.forEach( event => {
    let stroke = event.stroke

    if ( stroke === "IM" || stroke === "Medley" || stroke === "IND MEDLEY" ) {
      stroke = "Individual Medley"
    }

    if ( stroke === "FREESTYLE" ) {
      stroke = "Freestyle"
    }

    if ( stroke === "BREASTSTROKE" ) {
      stroke = "Breaststroke"
    }

    if ( stroke === "BUTTERFLY" ) {
      stroke = "Butterfly"
    }

    if ( stroke === "BACKSTROKE" ) {
      stroke = "Backstroke"
    }

    event.times.forEach( ( t: { age: string, time: string | null } ) => {
      const age = t.age
      if ( age === "10/11" || age === "10 & 11" ) {
        normalized.push( {
          gender: event.gender,
          event: event.event,
          distance: event.distance,
          stroke: stroke,
          age: "10",
          time: normalizeTime( t.time )
        } )
        normalized.push( {
          gender: event.gender,
          event: event.event,
          distance: event.distance,
          stroke: stroke,
          age: "11",
          time: normalizeTime( t.time )
        } )
      } else if ( age === "17/OV" ) {
        normalized.push( {
          gender: event.gender,
          event: event.event,
          distance: event.distance,
          stroke: stroke,
          age: "17+",
          time: normalizeTime( t.time )
        } )
      } else {
        normalized.push( {
          gender: event.gender,
          event: event.event,
          distance: event.distance,
          stroke: stroke,
          age,
          time: normalizeTime( t.time )
        } )
      }
    } )
  } )

  return normalized
}

// 2025-Devon-Championship-Qualifying-Times-V3
