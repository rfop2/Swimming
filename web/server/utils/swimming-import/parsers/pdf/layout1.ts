import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdf( text: string ) {
  const ages = [ "10 & 11", "12", "13", "14", "15", "16", "17+" ]
  const isStrokeWord = ( w: string ) =>
    [ "Freestyle", "Breaststroke", "Butterfly", "Backstroke", "IM" ].includes( w )

  const rawLines = text.split( "\n" ).map( l => l.trim() ).filter( Boolean )
  const events: ImportEvent[] = []

  const pushEvent = ( distance: string, stroke: string, femaleRaw: string[], maleRaw: string[] ) => {
    const eventName = `${distance} ${stroke}`

    const femaleTimes = Array( ages.length - femaleRaw.length ).fill( null ).concat( femaleRaw )
    const maleTimes = Array( ages.length - maleRaw.length ).fill( null ).concat( maleRaw )

    ages.forEach( ( age, idx ) => {
      const femaleTime = femaleTimes[idx] ?? null
      const maleTime = maleTimes[idx] ?? null

      if ( age === "10 & 11" ) {
        [ 10, 11 ].forEach( a => {
          events.push( { gender: "female", age: a, distance, stroke, event: eventName, time: normalizeTime( femaleTime ) } )
          events.push( { gender: "male", age: a, distance, stroke, event: eventName, time: normalizeTime( maleTime ) } )
        } )
      } else {
        events.push( { gender: "female", age, distance, stroke, event: eventName, time: normalizeTime( femaleTime ) } )
        events.push( { gender: "male", age, distance, stroke, event: eventName, time: normalizeTime( maleTime ) } )
      }
    } )
  }

  const isTime = ( t: string ) => /\d+\.\d/.test( t )

  for ( let i = 0; i < rawLines.length; i++ ) {
    const parts = rawLines[i].split( /\s+/ ).filter( Boolean )
    if ( !parts.length ) continue

    const anchorIdx = parts.findIndex( ( p, idx ) =>
      /^\d{2,4}$/.test( p ) && isStrokeWord( parts[idx + 1] )
    )
    if ( anchorIdx === -1 ) continue

    const distance = parts[anchorIdx]
    let stroke = parts[anchorIdx + 1]
    if ( stroke === "IM" ) stroke = "Individual Medley"

    const leftTokens = parts.slice( 0, anchorIdx )
    const rightTokens = parts.slice( anchorIdx + 2 )

    // sepcial case: Breaststroke
    if ( stroke === "Breaststroke" && leftTokens.length === 0 && i > 0 ) {
      const prevParts = rawLines[i - 1].split( /\s+/ ).filter( Boolean )
      const femaleTokens = prevParts.filter( isTime )

      let maleTokens = rightTokens.filter( isTime )
      let j = i + 1
      while ( maleTokens.length < ages.length && j < rawLines.length ) {
        const nextParts = rawLines[j].split( /\s+/ ).filter( Boolean )
        const nextAnchorIdx = nextParts.findIndex( ( p, idx ) =>
          /^\d{2,4}$/.test( p ) && isStrokeWord( nextParts[idx + 1] )
        )
        if ( nextAnchorIdx !== -1 ) break
        maleTokens = maleTokens.concat( nextParts.filter( isTime ) )
        j++
      }

      pushEvent( distance + "m", "Breaststroke", femaleTokens, maleTokens.slice( 0, ages.length ) )
      i = j - 1
      continue
    }

    const femaleRaw = leftTokens.filter( isTime )
    const maleRaw = rightTokens.filter( isTime )
    pushEvent( distance + "m", stroke, femaleRaw, maleRaw )
  }

  return events
}

// 2026 Qualifying times
