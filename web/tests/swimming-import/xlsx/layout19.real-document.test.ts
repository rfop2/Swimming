import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseSwimmingXlsxLayout19 } from "../../../server/utils/swimming-import/parsers/xlsx/layout19"
import { layout19XlsxPath, requireLayout19XlsxPath } from "../layout19Fixture"

describe.skipIf( !layout19XlsxPath )( "parseSwimmingXlsxLayout19 with the Wiltshire 2027 workbook", () => {
  it( "extracts both gender blocks and applies the document's age-10 exclusions", () => {
    const result = parseSwimmingXlsxLayout19( readFileSync( requireLayout19XlsxPath() ) )

    expect( result ).toHaveLength( 288 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 36 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 6 )

    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "43.50",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      age: "17+",
      time: "1:00.00",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "15",
      time: "2:55.00",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "female",
      event: "Freestyle 800m",
      age: "10",
      time: null,
    } ) )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "female",
      event: "Freestyle 800m",
      age: "11",
      time: "12:30.00",
    } ) )
  } )
} )
