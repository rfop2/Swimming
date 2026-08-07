import * as XLSX from "xlsx"
import type { ImportEvent } from "../../types"

type Cell = string | number | null | undefined

const strokeNames: Record<string, string> = {
  free: "Freestyle",
  back: "Backstroke",
  breast: "Breaststroke",
  "b/fly": "Butterfly",
  fly: "Butterfly",
  im: "Individual Medley",
}

const ageTenExclusions = new Set( [
  "Freestyle 800m",
  "Freestyle 1500m",
  "Individual Medley 400m",
] )

const cleanCell = ( value: Cell ) => String( value ?? "" ).replace( /\s+/g, " " ).trim()

function normalizeWiltshireTime( value: Cell ): string | null {
  const time = cleanCell( value ).replace( ",", "." )
  if ( !time || time === "-" ) return null

  const minuteTime = /^(\d{1,2})\.(\d{2})\.(\d{2})$/.exec( time )
  if ( minuteTime ) return `${Number( minuteTime[1] )}:${minuteTime[2]}.${minuteTime[3]}`

  return time
}

function expandAges( value: Cell ) {
  const age = cleanCell( value ).toLowerCase().replace( /\s+/g, "" )
  if ( /^10\/?11(?:yr|yrs)?$/.test( age ) ) return [ "10", "11" ]

  const number = /^(\d{1,2})/.exec( age )?.[1]
  if ( !number ) return []
  return age.includes( "+" ) ? [ `${number}+` ] : [ number ]
}

export function parseSwimmingXlsxLayout19( buffer: ArrayBuffer | Buffer ): ImportEvent[] {
  const workbook = XLSX.read( buffer, { type: "buffer" } )
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if ( !sheet ) return []

  const rows: Cell[][] = XLSX.utils.sheet_to_json( sheet, { header: 1, raw: false, defval: "" } )
  const events: ImportEvent[] = []

  rows.forEach( ( row, genderRowIndex ) => {
    const section = cleanCell( row[0] ).toLowerCase()
    const gender = section === "female"
      ? "female"
      : /(?:open\s*\/\s*)?male/.test( section ) ? "male" : null
    if ( !gender ) return

    const strokeRow = rows[genderRowIndex + 1] ?? []
    const distanceRow = rows[genderRowIndex + 2] ?? []
    const columns: Array<{ column: number, distance: string, stroke: string, event: string }> = []
    let currentStroke = ""

    for ( let column = 1; column < Math.max( strokeRow.length, distanceRow.length ); column++ ) {
      const strokeHeader = cleanCell( strokeRow[column] ).toLowerCase()
      if ( strokeNames[strokeHeader] ) currentStroke = strokeNames[strokeHeader]

      const distanceMatch = cleanCell( distanceRow[column] ).match( /(\d{2,4})\s*m?/i )
      if ( !currentStroke || !distanceMatch ) continue
      const distance = `${distanceMatch[1]}m`
      columns.push( { column, distance, stroke: currentStroke, event: `${currentStroke} ${distance}` } )
    }

    for ( let rowIndex = genderRowIndex + 3; rowIndex < rows.length; rowIndex++ ) {
      const ages = expandAges( rows[rowIndex]?.[0] )
      if ( ages.length === 0 ) break

      for ( const { column, distance, stroke, event } of columns ) {
        const sourceTime = normalizeWiltshireTime( rows[rowIndex]?.[column] )
        for ( const age of ages ) {
          events.push( {
            gender,
            age,
            course: "sc",
            distance,
            stroke,
            event,
            time: age === "10" && ageTenExclusions.has( event ) ? null : sourceTime,
          } )
        }
      }
    }
  } )

  return events
}
