import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout23 } from "../../../server/utils/swimming-import/parsers/pdf/layout23"
import { layout23PdfPath, requireLayout23PdfPath } from "../layout23Fixture"

describe.skipIf( !layout23PdfPath )( "parseSwimmingPdfLayout23 with the Cumbria 2027 PDF", () => {
  it( "imports both short-course gender tables in their opposite age orders", async () => {
    const text = await extractPdfText( readFileSync( requireLayout23PdfPath() ) )
    const result = parseSwimmingPdfLayout23( text )

    expect( result ).toHaveLength( 252 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 36 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 6 )

    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "50.89",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "16+",
      time: "27.39",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      age: "12",
      time: "4:15.89",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "10",
      time: "4:36.89",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "female",
      event: "Freestyle 800m",
      age: "10",
      time: null,
    } ) )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Individual Medley 400m",
      age: "10",
      time: null,
    } ) )
  }, 30_000 )
} )
