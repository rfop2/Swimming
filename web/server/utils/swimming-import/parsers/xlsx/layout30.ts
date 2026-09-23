import * as XLSX from "xlsx"
import type { ImportEvent } from "../../types"

type Cell = string | number | null | undefined

const ages = [ "10", "11", "12", "13", "14", "15", "16", "17+" ] as const

const cleanCell = ( value: Cell ) => String( value ?? "" ).replace( /\s+/g, " " ).trim()

function parseEvent( value: Cell ) {
  const match = /^(50|100|200|400|800|1500)m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Ind Medley)$/i.exec( cleanCell( value ) )
  if ( !match ) return null

  const distance = `${match[1]}m`
  const stroke = /ind medley/i.test( match[2] ) ? "Individual Medley" : match[2]
  return { distance, stroke, event: `${stroke} ${distance}` }
}

function normalizeDevonTime( value: Cell ): string | null {
  const time = cleanCell( value ).replace( ",", "." )
  if ( !time || time === "-" ) return null

  const separatedMinutes = /^(\d{1,2})[:.](\d{2})[:.](\d{1,2})$/.exec( time )
  if ( separatedMinutes ) {
    return `${separatedMinutes[1].padStart( 2, "0" )}:${separatedMinutes[2]}.${separatedMinutes[3].padEnd( 2, "0" )}`
  }

  const compactMinutes = /^(\d{2})(\d{2})\.(\d{1,2})$/.exec( time )
  if ( compactMinutes ) {
    return `${compactMinutes[1]}:${compactMinutes[2]}.${compactMinutes[3].padEnd( 2, "0" )}`
  }

  return /^\d{1,2}\.\d{1,2}$/.test( time ) ? time : null
}

function appendGenderRows(
  events: ImportEvent[],
  row: Cell[],
  gender: "male" | "female",
  firstTimeColumn: number,
  course: "sc" | "lc",
  event: { distance: string, stroke: string, event: string }
) {
  ages.forEach( ( age, ageIndex ) => {
    events.push( {
      gender,
      age,
      course,
      distance: event.distance,
      stroke: event.stroke,
      event: event.event,
      time: normalizeDevonTime( row[firstTimeColumn + ageIndex] ),
    } )
  } )
}

// Devon publishes 25m and 50m values on consecutive rows. The event name appears
// on the 25m row only, in the centre between the male and female age columns.
export function parseSwimmingXlsxLayout30( buffer: ArrayBuffer | Buffer ): ImportEvent[] {
  const workbook = XLSX.read( buffer, { type: "buffer" } )
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if ( !sheet ) return []

  const rows: Cell[][] = XLSX.utils.sheet_to_json( sheet, { header: 1, raw: false, defval: "" } )
  const sourceText = rows.flat().map( cleanCell ).join( " " ).toLowerCase()
  if (
    !sourceText.includes( "devon county asa 2027 consideration times" )
    || !sourceText.includes( "open / male 2027 times" )
    || !sourceText.includes( "female 2027 times" )
  ) return []

  const events: ImportEvent[] = []

  for ( let rowIndex = 0; rowIndex < rows.length; rowIndex++ ) {
    const shortCourseRow = rows[rowIndex] ?? []
    const event = parseEvent( shortCourseRow[9] )
    if ( !event || cleanCell( shortCourseRow[0] ) !== "25m" || cleanCell( shortCourseRow[18] ) !== "25m" ) continue

    appendGenderRows( events, shortCourseRow, "male", 1, "sc", event )
    appendGenderRows( events, shortCourseRow, "female", 10, "sc", event )

    // 100m Individual Medley is a 25m-pool event and therefore has no 50m row.
    const longCourseRow = rows[rowIndex + 1] ?? []
    if ( cleanCell( longCourseRow[0] ) !== "50m" || cleanCell( longCourseRow[18] ) !== "50m" ) continue

    appendGenderRows( events, longCourseRow, "male", 1, "lc", event )
    appendGenderRows( events, longCourseRow, "female", 10, "lc", event )
  }

  return events
}
