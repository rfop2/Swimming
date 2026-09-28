import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout31 } from "../../../server/utils/swimming-import/parsers/pdf/layout31"
import { layout31PdfPath, requireLayout31PdfPath } from "../layout31Fixture"

describe.skipIf( !layout31PdfPath )( "parseSwimmingPdfLayout31 with the Cheshire 2027 PDF", () => {
  it( "combines both age-group pages and normalizes inconsistent time separators", async () => {
    const text = await extractPdfText( readFileSync( requireLayout31PdfPath() ) )
    const result = parseSwimmingPdfLayout31( text )

    expect( result ).toHaveLength( 288 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 36 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "36.50",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Backstroke 200m",
      distance: "200m",
      stroke: "Backstroke",
      age: "13",
      time: "02:49.00",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Freestyle 800m",
      distance: "800m",
      stroke: "Freestyle",
      age: "17+",
      time: "10:20.00",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Freestyle 800m",
      age: "10",
      time: null,
    } ) )
  }, 30_000 )
} )
