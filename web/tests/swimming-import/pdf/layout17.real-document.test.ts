import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout17 } from "../../../server/utils/swimming-import/parsers/pdf/layout17"
import { layout17PdfPath, requireLayout17PdfPath } from "../layout17Fixture"

describe.skipIf( !layout17PdfPath )( "parseSwimmingPdfLayout17 with the Surrey 2027 PDF", () => {
  it( "extracts qualifying times for both courses and excludes consideration times", async () => {
    const text = await extractPdfText( readFileSync( requireLayout17PdfPath() ) )
    const result = parseSwimmingPdfLayout17( text )

    expect( result ).toHaveLength( 612 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 68 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 24 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "lc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "33.81",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      age: "18+",
      time: "52.20",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "lc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "14",
      time: "2:38.00",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Freestyle 800m",
      distance: "800m",
      stroke: "Freestyle",
      age: "10",
      time: null,
    } )

    expect( result ).not.toContainEqual( expect.objectContaining( {
      gender: "male",
      course: "lc",
      event: "Freestyle 50m",
      age: "10",
      time: "35.50",
    } ) )
  }, 30_000 )
} )
