import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout21 } from "../../../server/utils/swimming-import/parsers/pdf/layout21"
import { layout21PdfPath, requireLayout21PdfPath } from "../layout21Fixture"

describe.skipIf( !layout21PdfPath )( "parseSwimmingPdfLayout21 with the Northamptonshire 2027 PDF", () => {
  it( "imports both gender tables and preserves missing 10/11 distance times", async () => {
    const text = await extractPdfText( readFileSync( requireLayout21PdfPath() ) )
    const result = parseSwimmingPdfLayout21( text )

    expect( result ).toHaveLength( 238 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 34 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "0:47.3",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      age: "12",
      time: "3:55.0",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "16+",
      time: "3:14.8",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "female",
      event: "Individual Medley 400m",
      age: "11",
      time: null,
    } ) )
  }, 30_000 )
} )
