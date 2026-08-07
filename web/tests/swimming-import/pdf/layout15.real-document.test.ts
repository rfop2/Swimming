import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout15 } from "../../../server/utils/swimming-import/parsers/pdf/layout15"
import { layout15PdfPath, requireLayout15PdfPath } from "../layout15Fixture"

describe.skipIf( !layout15PdfPath )( "parseSwimmingPdfLayout15 with the Suffolk 2027 PDF", () => {
  it( "extracts the complete document and representative times", async () => {
    const text = await extractPdfText( readFileSync( requireLayout15PdfPath() ) )
    const result = parseSwimmingPdfLayout15( text )

    expect( result ).toHaveLength( 256 )
    expect( new Set( result.map( row => `${row.gender}:${row.event}` ) ) ).toHaveLength( 32 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 4 )

    expect( result ).toContainEqual( {
      gender: "female",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "00:41.4",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      age: "17+",
      time: "01:01.6",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "13",
      time: "03:16.8",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      event: "Individual Medley 400m",
      distance: "400m",
      stroke: "Individual Medley",
      age: "10",
      time: null,
    } )
  }, 30_000 )
} )
