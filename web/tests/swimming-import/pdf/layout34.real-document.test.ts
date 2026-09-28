import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout34 } from "../../../server/utils/swimming-import/parsers/pdf/layout34"
import { layout34PdfPath, requireLayout34PdfPath } from "../layout34Fixture"

describe.skipIf( !layout34PdfPath )( "parseSwimmingPdfLayout34 with the London Winter 2026 PDF", () => {
  it( "imports QT values for both courses and expands the 16-and-under group", async () => {
    const text = await extractPdfText( readFileSync( requireLayout34PdfPath() ) )
    const result = parseSwimmingPdfLayout34( text )

    expect( result ).toHaveLength( 560 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 0 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 70 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "lc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "26.38",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "lc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "16",
      time: "26.38",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "lc",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      age: "17+",
      time: "2:52.38",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Butterfly 100m",
      distance: "100m",
      stroke: "Butterfly",
      age: "17+",
      time: "58.70",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Individual Medley 100m",
      distance: "100m",
      stroke: "Individual Medley",
      age: "10",
      time: "1:10.00",
    } )
  }, 30_000 )
} )
