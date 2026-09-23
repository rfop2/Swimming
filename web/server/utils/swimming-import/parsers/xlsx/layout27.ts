import * as XLSX from "xlsx"
import type { ImportEvent } from "../../types"

type Cell = string | number | null | undefined

const qualificationColumns = [ 2, 6, 10, 14, 18, 22 ] as const
const ageGroups = [ [ "10", "11" ], [ "12" ], [ "13" ], [ "14" ], [ "15" ], [ "16+" ] ] as const

const strokeNames: Record<string, string> = {
  free: "Freestyle",
  breast: "Breaststroke",
  fly: "Butterfly",
  back: "Backstroke",
  im: "Individual Medley",
}

const cleanCell = ( value: Cell ) => String( value ?? "" ).replace( /\s+/g, " " ).trim()

function parseEvent( row: Cell[] ) {
  const distanceMatch = /^(50|100|200|400|800|1500)m$/i.exec( cleanCell( row[0] ) )
  const stroke = strokeNames[cleanCell( row[1] ).toLowerCase()]
  if ( !distanceMatch || !stroke ) return null

  const distance = `${distanceMatch[1]}m`
  return { distance, stroke, event: `${stroke} ${distance}` }
}

function normalizeHertfordshireTime( value: Cell ): string | null {
  const time = cleanCell( value ).replace( ",", "." )
  return /^(?:\d{1,2}:)?\d{1,2}\.\d{1,2}$/.test( time ) ? time : null
}

// The workbook contains QT and CT columns for each age group. The application stores
// one General threshold per event, so only the QT columns are imported.
export function parseSwimmingXlsxLayout27( buffer: ArrayBuffer | Buffer ): ImportEvent[] {
  const workbook = XLSX.read( buffer, { type: "buffer" } )
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if ( !sheet ) return []

  const rows: Cell[][] = XLSX.utils.sheet_to_json( sheet, { header: 1, raw: false, defval: "" } )
  const sourceText = rows.flat().map( cleanCell ).join( " " ).toLowerCase()
  if (
    !sourceText.includes( "open/male" )
    || !sourceText.includes( "female" )
    || !sourceText.includes( "qualifying window" )
    || !sourceText.includes( "qt" )
    || !sourceText.includes( "ct" )
  ) return []

  const events: ImportEvent[] = []
  let gender: "male" | "female" | null = null

  for ( const row of rows ) {
    const section = cleanCell( row[2] ).toLowerCase()
    if ( section === "open/male" ) {
      gender = "male"
      continue
    }
    if ( section === "female" ) {
      gender = "female"
      continue
    }
    if ( !gender ) continue

    const event = parseEvent( row )
    if ( !event ) continue

    qualificationColumns.forEach( ( column, ageGroupIndex ) => {
      const time = normalizeHertfordshireTime( row[column] )
      for ( const age of ageGroups[ageGroupIndex] ?? [] ) {
        events.push( {
          gender,
          age,
          course: "sc",
          distance: event.distance,
          stroke: event.stroke,
          event: event.event,
          time,
        } )
      }
    } )
  }

  return events
}
