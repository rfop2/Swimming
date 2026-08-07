import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdfLayout4( text: string ) {
  const lines = text.split( "\n" ).map( l => l.trim() ).filter( Boolean )

  const ages = [ "10-11", "12", "13", "14", "15", "16", "17" ]
  const strokes = [ "Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM" ]

  const structured: ImportEvent[] = []
  let currentCourse: "lc" | "sc" | null = null
  let currentGender: "male" | "female" | null = null

  for ( let lineIndex = 0; lineIndex < lines.length; lineIndex++ ) {
    let line = lines[lineIndex]
    // Detect course
    if ( /Qualifying Times.*LONG COURSE/i.test( line ) ) {
      currentCourse = "lc"
      continue
    }
    if ( /Qualifying Times.*SHORT COURSE/i.test( line ) ) {
      currentCourse = "sc"
      continue
    }

    if ( lineIndex < 39 ) {
      currentGender = "female"
    } else {
      currentGender = "male"
    }

    // Ignore headers
    if (
      /Automatic Times/i.test( line )
      || /Consideration Times/i.test( line )
      || /Stroke\s*Distance/i.test( line )
    ) {
      continue
    }

    let matchedStroke: string | null = null
    let distance: string | undefined = undefined

    for ( const stroke of strokes ) {
      const strokeIndex = line.indexOf( stroke )
      if ( strokeIndex === -1 ) continue

      matchedStroke = stroke

      const timesPart = line.slice( 0, strokeIndex ).trim()
      const afterStroke = line.slice( strokeIndex + stroke.length )

      const m = afterStroke.match( /^\s*(50|100|200|400|800|1500)\b/ )
      if ( !m ) {
        matchedStroke = null
        continue
      }

      distance = m[1]
      line = `${timesPart} ${stroke} ${distance}`
      break
    }

    if ( !matchedStroke || !distance ) continue

    line = line.replace( /n\/a(?=\d)/gi, "n/a " )

    const event = `${matchedStroke} ${distance}m`

    const timesRaw = line.split( `${matchedStroke} ${distance}` )[0].trim().split( /\s+/ ).filter( Boolean )

    matchedStroke = matchedStroke === "IM" ? "Individual Medley" : matchedStroke

    const times = timesRaw.length < ages.length
      ? Array( ages.length - timesRaw.length ).fill( null ).concat( timesRaw )
      : timesRaw
    for ( let idx = 0; idx < ages.length; idx++ ) {
      const ageLabel = ages[idx]
      const rawTime = times[idx] ?? null
      let time = rawTime && rawTime.toLowerCase() !== "n/a" ? rawTime : null
      time = normalizeTime( time )

      if ( ageLabel === "10-11" ) {
        structured.push( { gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: "10", time } )
        structured.push( { gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: "11", time } )
      } else if ( ageLabel === "17" ) {
        structured.push( { gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: "17+", time } )
      } else {
        structured.push( { gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: ageLabel, time } )
      }
    }
  }

  return structured
}

// 2025-qualifying-times_079840
// only Accepted (Lower) times
