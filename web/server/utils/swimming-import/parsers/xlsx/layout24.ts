import * as XLSX from "xlsx"
import type { ImportEvent } from "../../types"

type Cell = string | number | null | undefined

const strokeNames: Record<string, string> = {
  free: "Freestyle",
  back: "Backstroke",
  breast: "Breaststroke",
  fly: "Butterfly",
  im: "Individual Medley",
}

const cleanCell = ( value: Cell ) => String( value ?? "" ).replace( /\s+/g, " " ).trim()

function expandAges( value: Cell ) {
  const age = cleanCell( value ).toLowerCase().replace( /\s+/g, "" )
  if ( age === "10/11" ) return [ "10", "11" ]

  const number = /^(\d{1,2})/.exec( age )?.[1]
  if ( !number ) return []
  return /(?:&over|\+)$/.test( age ) ? [ `${number}+` ] : [ number ]
}

function normalizeTime( value: Cell ): string | null {
  const time = cleanCell( value )
  return /^(?:\d{1,2}:)?\d{1,2}\.\d{2}$/.test( time ) ? time : null
}

// The workbook contains QT and CT side by side. The application stores one threshold for each
// gender/event/age, so this parser deliberately imports only the qualifying-time (QT) columns.
export function parseSwimmingXlsxLayout24( buffer: ArrayBuffer | Buffer ): ImportEvent[] {
  const workbook = XLSX.read( buffer, { type: "buffer" } )
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if ( !sheet ) return []

  const rows: Cell[][] = XLSX.utils.sheet_to_json( sheet, { header: 1, raw: false, defval: "" } )
  const events: ImportEvent[] = []

  rows.forEach( ( row, sectionIndex ) => {
    const section = row.map( cleanCell ).find( value => /^(?:open\s*\/\s*male|female)$/i.test( value ) )
    const gender = /^female$/i.test( section ?? "" )
      ? "female"
      : /^open\s*\/\s*male$/i.test( section ?? "" ) ? "male" : null
    if ( !gender ) return

    const ageRowIndex = rows.findIndex( ( candidate, index ) =>
      index > sectionIndex && index <= sectionIndex + 4 && /^age$/i.test( cleanCell( candidate[0] ) )
    )
    if ( ageRowIndex < 0 ) return

    const ageRow = rows[ageRowIndex] ?? []
    const typeRow = rows[ageRowIndex + 1] ?? []
    const ageColumns: Array<{ column: number, ages: string[] }> = []

    for ( let column = 0; column < ageRow.length; column++ ) {
      const ages = expandAges( ageRow[column] )
      if ( ages.length > 0 && /^qt$/i.test( cleanCell( typeRow[column] ) ) ) {
        ageColumns.push( { column, ages } )
      }
    }

    for ( let rowIndex = ageRowIndex + 2; rowIndex < rows.length; rowIndex++ ) {
      const distanceMatch = /^(\d{2,4})m$/i.exec( cleanCell( rows[rowIndex]?.[0] ) )
      const stroke = strokeNames[cleanCell( rows[rowIndex]?.[1] ).toLowerCase()]
      if ( !distanceMatch || !stroke ) break

      const distance = `${distanceMatch[1]}m`
      const event = `${stroke} ${distance}`

      for ( const { column, ages } of ageColumns ) {
        const time = normalizeTime( rows[rowIndex]?.[column] )
        for ( const age of ages ) {
          events.push( { gender, age, course: "sc", distance, stroke, event, time } )
        }
      }
    }
  } )

  return events
}
