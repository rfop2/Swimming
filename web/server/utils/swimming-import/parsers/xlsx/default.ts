import * as XLSX from "xlsx"
import type { ImportEvent } from "../../types"
import { normalizeTime } from "../../shared/normalizeTime"

export function parseSwimmingXlsx( buffer: ArrayBuffer | Buffer ) {
  const workbook = XLSX.read( buffer, { type: "buffer" } )
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // read all rows as array of arrays
  const rows: string[][] = XLSX.utils.sheet_to_json( sheet, { header: 1, raw: false } )

  const ages = [ "10yrs", "11yrs", "12yrs", "13yrs", "14yrs", "15yrs", "16yrs", "17/ov" ]
  const events: ImportEvent[] = []
  let currentDistance = ""
  let currentStroke = ""

  const headersToIgnore = [ "DEVON", "DORSET", "CONSIDERATION", "Entry times", "Ages as at", "Open / Male" ]

  for ( let row of rows ) {
    row = row.map( ( cell ) => ( cell ? cell.toString().trim() : "" ) )

    const middleCells = row.slice( 1, row.length - 1 )

    if ( !row.some( ( cell ) => cell ) ) continue

    const rowStr = row.map( ( cell ) => cell.replace( /\s+/g, " " ).trim() ).join( " " )

    if ( headersToIgnore.some( ( h ) => rowStr.toUpperCase().includes( h.toUpperCase() ) ) ) continue
    if ( row.every( ( cell ) => ages.includes( cell ) ) ) continue

    const distanceStrokeCell = middleCells.find( ( cell ) => /\d{2,3}m/.test( cell ) && /[A-Za-z]/.test( cell ) )
    if ( distanceStrokeCell ) {
      const parts = distanceStrokeCell.split( " " )
      currentDistance = parts[0]
      currentStroke = parts.slice( 1 ).join( " " )
      if ( [ "IM", "Medley", "Ind Medley" ].includes( currentStroke ) ) currentStroke = "Individual Medley"
      continue
    }

    const numericCells = Array.from( row.slice( 1, row.length - 1 ), ( cell ) => {
      if ( !cell ) return null
      const fixed = fixRawTime( cell )
      return normalizeTime( fixed )
    } )

    const maleTimes = numericCells.slice( 0, 8 ).map( ( t ) => ( t === null ? null : t ) )
    const femaleTimes = numericCells.slice( 9, 17 ).map( ( t ) => ( t === null ? null : t ) )

    ages.forEach( ( age, idx ) => {
      events.push( {
        gender: "male",
        age: normalizeAge( age ),
        distance: currentDistance,
        stroke: currentStroke,
        event: `${currentDistance} ${currentStroke}`,
        time: maleTimes[idx] || null,
      } )
      events.push( {
        gender: "female",
        age: normalizeAge( age ),
        distance: currentDistance,
        stroke: currentStroke,
        event: `${currentDistance} ${currentStroke}`,
        time: femaleTimes[idx] || null,
      } )
    } )
  }

  return events
}

// 2025-hcasa-champs-qts-v2

// Formats a fractional-seconds value as a zero-padded "SS.ff" tail, e.g. 19.5 -> "19.50".
const secondsWithDecimal = ( seconds: number ): string => {
  const wholeSeconds = Math.floor( seconds )
  const hundredths = Math.round( ( seconds - wholeSeconds ) * 100 )
  return `${wholeSeconds.toString().padStart( 2, "0" )}.${hundredths.toString().padStart( 2, "0" )}`
}

function fixRawTime( value: string | number ): string {
  if ( typeof value === "string" ) {
    // case 1: multiple dots like "2.48.10" → "00:02:48.10"
    if ( ( value.match( /\./g ) || [] ).length >= 2 ) {
      const [ minPart, secPart, decPart ] = value.split( "." ) as [ string, string, string? ]
      const minutes = minPart.padStart( 2, "0" )
      const seconds = secPart.padStart( 2, "0" )
      // Pad on the right — this is a decimal fraction ("8" means .8, not .08).
      const hundredths = ( decPart ?? "0" ).padEnd( 2, "0" ).slice( 0, 2 )
      return `00:${minutes}:${seconds}.${hundredths}`
    }

    // case 2: concatenated MMSS.s like "0140.8" → "00:01:40.80"
    const match = value.match( /^0?(\d+)(\d{2})(?:\.(\d+))?$/ )
    if ( match ) {
      const minutes = parseInt( match[1]!, 10 )
      const seconds = parseInt( match[2]!, 10 )
      // Pad on the right — this is a decimal fraction ("8" means .8, not .08).
      const hundredths = ( match[3] ?? "0" ).padEnd( 2, "0" ).slice( 0, 2 )
      return `00:${String( minutes ).padStart( 2, "0" )}:${String( seconds ).padStart( 2, "0" )}.${hundredths}`
    }

    // fallback: keep original string
    return value
  }

  // numbers: treat as Excel fraction or minutes
  if ( typeof value === "number" ) {
    if ( value > 0 && value < 1 ) {
      const totalSeconds = value * 24 * 60 * 60
      const hours = Math.floor( totalSeconds / 3600 )
      const minutes = Math.floor( ( totalSeconds % 3600 ) / 60 )
      const seconds = totalSeconds % 60
      return `${hours.toString().padStart( 2, "0" )}:${minutes.toString().padStart( 2, "0" )}:${secondsWithDecimal( seconds )}`
    }
    if ( value >= 1 ) {
      const minutes = Math.floor( value / 60 )
      const seconds = value % 60
      return `00:${minutes.toString().padStart( 2, "0" )}:${secondsWithDecimal( seconds )}`
    }
  }

  return ""
}

function normalizeAge( age: string | null | undefined ): string {
  if ( !age ) return ""

  switch ( age ) {
    case "10yrs": return "10"
    case "11yrs": return "11"
    case "12yrs": return "12"
    case "13yrs": return "13"
    case "14yrs": return "14"
    case "15yrs": return "15"
    case "16yrs": return "16"
    case "17/ov": return "17+"
    default: return age
  }
}
