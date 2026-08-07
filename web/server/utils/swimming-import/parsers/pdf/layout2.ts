import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingPdfLayout2( text: string ) {
  const lines = text.split( "\n" ).map( l => l.trim() ).filter( Boolean )

  const ages = [ "10 & 11", "12", "13", "14", "15", "16", "17/OV" ]

  const structured = []
  let currentGender: string | null = null

  for ( const line of lines ) {
    // detect gender
    if ( /Mens\/Open/i.test( line ) ) {
      currentGender = "male"
      continue
    }
    if ( /Female/i.test( line ) ) {
      currentGender = "female"
      continue
    }

    if ( /^EVENT\b/i.test( line ) ) continue // ignore headers

    if ( /^\d{2,4}m/i.test( line ) ) {
      const parts = line.split( /\s+/ )
      const event = parts[0] + " " + parts[1]
      const distance = parts[0]
      let stroke = parts[1]

      if ( stroke === "IM" || stroke === "Medley" ) {
        stroke = "Individual Medley"
      }

      let times = parts.slice( 2 )

      if ( times.length < ages.length ) {
        times = Array( ages.length - times.length ).fill( null ).concat( times )
      }

      ages.forEach( ( ageLabel, idx ) => {
        let time = times[idx] || null
        time = normalizeTime( time )

        if ( ageLabel === "10 & 11" ) {
          structured.push( { gender: currentGender, event, distance, stroke, age: "10", time } )
          structured.push( { gender: currentGender, event, distance, stroke, age: "11", time } )
        } else if ( ageLabel === "17/OV" ) {
          structured.push( { gender: currentGender, event, distance, stroke, age: "17+", time } )
        } else {
          structured.push( { gender: currentGender, event, distance, stroke, age: ageLabel, time } )
        }
      } )
    }
  }

  return structured
}

// 2025-Dorset-County-ASA-Championships-Entry-Information-Iss-4-071124
