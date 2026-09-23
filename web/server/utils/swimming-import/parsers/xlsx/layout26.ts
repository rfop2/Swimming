import * as XLSX from "xlsx"
import type { ImportEvent } from "../../types"

type Cell = string | number | null | undefined

const ageGroups = [
  [ "10", "11" ],
  [ "12" ],
  [ "13" ],
  [ "14" ],
  [ "15" ],
  [ "16" ],
  [ "17+" ],
] as const

const femaleQualificationColumns = [ 1, 3, 5, 7, 9, 11, 13 ] as const
const maleQualificationColumns = [ 16, 18, 20, 22, 24, 26, 28 ] as const

const cleanCell = ( value: Cell ) => String( value ?? "" ).replace( /\s+/g, " " ).trim()

function normalizeCambridgeshireTime( value: Cell ): string | null {
  const cleaned = cleanCell( value ).replace( ",", "." ).replace( /\.{2,}/g, "." )
  if ( !cleaned || cleaned === "-" ) return null

  const minuteTime = /^(\d{1,2})\.(\d{2})\.(\d{1,2})$/.exec( cleaned )
  if ( minuteTime ) return `${Number( minuteTime[1] )}:${minuteTime[2]}.${minuteTime[3]}`

  return cleaned
}

function parseEvent( value: Cell ) {
  const match = /^(\d{2,4})\s*(Freestyle|Backstroke|Breaststroke|Butterfly|IM)$/i.exec( cleanCell( value ) )
  if ( !match ) return null

  const distance = `${match[1]}m`
  const stroke = match[2].toUpperCase() === "IM" ? "Individual Medley" : match[2]
  return { distance, stroke, event: `${stroke} ${distance}` }
}

function appendGenderRows(
  events: ImportEvent[],
  row: Cell[],
  gender: "female" | "male",
  columns: readonly number[],
  event: { distance: string, stroke: string, event: string }
) {
  columns.forEach( ( column, ageGroupIndex ) => {
    const time = normalizeCambridgeshireTime( row[column] )
    const ages = ageGroups[ageGroupIndex] ?? []
    for ( const age of ages ) {
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

// Cambridgeshire 2026 QT/CT workbook reused for the 2027 championships.
// The application stores one county threshold for each event, so this parser imports
// the Qualification Time columns and deliberately excludes the Consideration Time columns.
export function parseSwimmingXlsxLayout26( buffer: ArrayBuffer | Buffer ): ImportEvent[] {
  const workbook = XLSX.read( buffer, { type: "buffer" } )
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if ( !sheet ) return []

  const rows: Cell[][] = XLSX.utils.sheet_to_json( sheet, { header: 1, raw: false, defval: "" } )
  const sourceText = rows.flat().map( cleanCell ).join( " " ).toLowerCase()
  if (
    !sourceText.includes( "cambridgeshire county championships qualifying times 2026" )
    || !sourceText.includes( "qualification time" )
    || !sourceText.includes( "consideration time" )
  ) return []

  const events: ImportEvent[] = []

  for ( const row of rows ) {
    const femaleEvent = parseEvent( row[0] )
    const maleEvent = parseEvent( row[15] )
    if ( !femaleEvent || !maleEvent || femaleEvent.event !== maleEvent.event ) continue

    appendGenderRows( events, row, "female", femaleQualificationColumns, femaleEvent )
    appendGenderRows( events, row, "male", maleQualificationColumns, maleEvent )
  }

  return events
}
