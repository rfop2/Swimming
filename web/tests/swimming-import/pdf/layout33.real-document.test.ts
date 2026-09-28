import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout33 } from "../../../server/utils/swimming-import/parsers/pdf/layout33"
import { layout33PdfPath, requireLayout33PdfPath } from "../layout33Fixture"

describe.skipIf( !layout33PdfPath )( "parseSwimmingPdfLayout33 with the Essex 2027 PDF", () => {
  it( "extracts both genders and preserves unavailable 10/11 long-distance times", async () => {
    const text = await extractPdfText( readFileSync( requireLayout33PdfPath() ) )
    const result = parseSwimmingPdfLayout33( text )

    expect( result ).toHaveLength( 306 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 34 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "00:36.14",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Freestyle 200m",
      distance: "200m",
      stroke: "Freestyle",
      age: "16",
      time: "00:25.65",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Backstroke 100m",
      distance: "100m",
      stroke: "Backstroke",
      age: "17",
      time: "01:32.32",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "female",
      event: "Individual Medley 400m",
      age: "11",
      time: null,
    } ) )
  }, 30_000 )
} )
