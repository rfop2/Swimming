import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseSwimmingXlsxLayout27 } from "../../../server/utils/swimming-import/parsers/xlsx/layout27"
import { layout27XlsxPath, requireLayout27XlsxPath } from "../layout27Fixture"

describe.skipIf( !layout27XlsxPath )( "parseSwimmingXlsxLayout27 with the Hertfordshire QT/CT workbook", () => {
  it( "extracts the QT columns and excludes CT values", () => {
    const result = parseSwimmingXlsxLayout27( readFileSync( requireLayout27XlsxPath() ) )

    expect( result ).toHaveLength( 252 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 36 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "00:35.00",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      age: "12",
      time: "03:20.48",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "16+",
      time: "02:33.72",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Freestyle 800m",
      age: "10",
      time: null,
    } ) )
    expect( result ).not.toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Freestyle 50m",
      age: "10",
      time: "00:37.80",
    } ) )
  } )
} )
