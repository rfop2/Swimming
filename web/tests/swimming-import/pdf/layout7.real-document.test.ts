import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout7 } from "../../../server/utils/swimming-import/parsers/pdf/layout7"
import { layout7PdfPath, requireLayout7PdfPath } from "../layout7Fixture"

describe.skipIf( !layout7PdfPath )( "parseSwimmingPdfLayout7 with the Berkshire 2027 PDF", () => {
  it( "extracts all events and known consideration times", async () => {
    const text = await extractPdfText( readFileSync( requireLayout7PdfPath() ) )
    const result = parseSwimmingPdfLayout7( text )

    expect( result ).toHaveLength( 272 )
    expect( new Set( result.map( row => `${row.gender}:${row.event}` ) ) ).toHaveLength( 34 )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "37.5",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Freestyle 800m",
      distance: "800m",
      stroke: "Freestyle",
      age: "10",
      time: null,
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Freestyle 800m",
      distance: "800m",
      stroke: "Freestyle",
      age: "12",
      time: "00:11:45",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      event: "Individual Medley 400m",
      distance: "400m",
      stroke: "Individual Medley",
      age: "12",
      time: "00:07:00",
    } )
  }, 30_000 )
} )
