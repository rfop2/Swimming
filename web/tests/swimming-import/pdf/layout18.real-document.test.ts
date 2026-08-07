import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout18 } from "../../../server/utils/swimming-import/parsers/pdf/layout18"
import { layout18PdfPath, requireLayout18PdfPath } from "../layout18Fixture"

describe.skipIf( !layout18PdfPath )( "parseSwimmingPdfLayout18 with the Warwickshire 2027 PDF", () => {
  it( "extracts the complete document and preserves decimal time precision", async () => {
    const text = await extractPdfText( readFileSync( requireLayout18PdfPath() ) )
    const result = parseSwimmingPdfLayout18( text )

    expect( result ).toHaveLength( 306 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 34 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )

    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "40.0",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      age: "18+",
      time: "58.9",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "14",
      time: "2:51.5",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Individual Medley 400m",
      distance: "400m",
      stroke: "Individual Medley",
      age: "10",
      time: null,
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "female",
      event: "Freestyle 1500m",
      age: "12",
      time: "24:30.1",
    } ) )
  }, 30_000 )
} )
