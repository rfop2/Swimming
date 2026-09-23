import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseSwimmingXlsxLayout26 } from "../../../server/utils/swimming-import/parsers/xlsx/layout26"
import { layout26XlsxPath, requireLayout26XlsxPath } from "../layout26Fixture"

describe.skipIf( !layout26XlsxPath )( "parseSwimmingXlsxLayout26 with the Cambridgeshire QT/CT workbook", () => {
  it( "extracts qualification times and excludes consideration columns", () => {
    const result = parseSwimmingXlsxLayout26( readFileSync( requireLayout26XlsxPath() ) )

    expect( result ).toHaveLength( 288 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 36 )

    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "40.5",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "11",
      time: "40.5",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      age: "17+",
      time: "58",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "14",
      time: "2:51.0",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "female",
      event: "Freestyle 800m",
      age: "10",
      time: null,
    } ) )

    const female50Free10 = result.find( row => row.gender === "female" && row.event === "Freestyle 50m" && row.age === "10" )
    expect( female50Free10?.time ).not.toBe( "42.5" )
  } )
} )
