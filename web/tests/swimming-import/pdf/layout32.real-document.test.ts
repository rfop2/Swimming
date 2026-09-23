import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout32 } from "../../../server/utils/swimming-import/parsers/pdf/layout32"
import { layout32PdfPath, requireLayout32PdfPath } from "../layout32Fixture"

describe.skipIf( !layout32PdfPath )( "parseSwimmingPdfLayout32 with the East Region 2026 PDF", () => {
  it( "extracts women and men/open times and expands the shared 11/12 age group", async () => {
    const text = await extractPdfText( readFileSync( requireLayout32PdfPath() ) )
    const result = parseSwimmingPdfLayout32( text )

    expect( result ).toHaveLength( 238 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 0 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 34 )

    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "11",
      time: "31.80",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "12",
      time: "31.80",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 1500m",
      distance: "1500m",
      stroke: "Freestyle",
      age: "13",
      time: "20:40.00",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Backstroke 100m",
      distance: "100m",
      stroke: "Backstroke",
      age: "14",
      time: "01:11.50",
    } )
  }, 30_000 )
} )
