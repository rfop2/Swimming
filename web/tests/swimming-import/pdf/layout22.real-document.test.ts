import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout22 } from "../../../server/utils/swimming-import/parsers/pdf/layout22"
import { layout22PdfPath, requireLayout22PdfPath } from "../layout22Fixture"

describe.skipIf( !layout22PdfPath )( "parseSwimmingPdfLayout22 with the Lancashire 2027 PDF", () => {
  it( "imports both short-course gender tables and preserves No Event values", async () => {
    const text = await extractPdfText( readFileSync( requireLayout22PdfPath() ) )
    const result = parseSwimmingPdfLayout22( text )

    expect( result ).toHaveLength( 272 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 34 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "36.59",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      age: "12",
      time: "3:25.59",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "17+",
      time: "2:37.59",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Freestyle 800m",
      age: "11",
      time: null,
    } ) )
  }, 30_000 )
} )
