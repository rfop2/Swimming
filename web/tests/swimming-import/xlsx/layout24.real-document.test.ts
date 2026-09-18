import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseSwimmingXlsxLayout24 } from "../../../server/utils/swimming-import/parsers/xlsx/layout24"
import { layout24XlsxPath, requireLayout24XlsxPath } from "../layout24Fixture"

describe.skipIf( !layout24XlsxPath )( "parseSwimmingXlsxLayout24 with the Hertfordshire 2027 workbook", () => {
  it( "imports the QT columns for both genders and keeps unavailable youngest times empty", () => {
    const result = parseSwimmingXlsxLayout24( readFileSync( requireLayout24XlsxPath() ) )

    expect( result ).toHaveLength( 252 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 36 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )

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
      age: "11",
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
