import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseSwimmingXlsxLayout30 } from "../../../server/utils/swimming-import/parsers/xlsx/layout30"
import { layout30XlsxPath, requireLayout30XlsxPath } from "../layout30Fixture"

describe.skipIf( !layout30XlsxPath )( "parseSwimmingXlsxLayout30 with the Devon 2027 workbook", () => {
  it( "extracts both courses and normalizes the workbook time variants", () => {
    const result = parseSwimmingXlsxLayout30( readFileSync( requireLayout30XlsxPath() ) )

    expect( result ).toHaveLength( 560 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 24 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 70 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "41.20",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "lc",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      age: "17+",
      time: "01:04.30",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "lc",
      event: "Butterfly 100m",
      distance: "100m",
      stroke: "Butterfly",
      age: "11",
      time: "02:00.60",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "female",
      course: "sc",
      event: "Individual Medley 100m",
      age: "16",
      time: "01:19.00",
    } ) )
    expect( result ).not.toContainEqual( expect.objectContaining( {
      course: "lc",
      event: "Individual Medley 100m",
    } ) )
  } )
} )
