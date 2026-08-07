import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout20 } from "../../../server/utils/swimming-import/parsers/pdf/layout20"
import { layout20PdfPath, requireLayout20PdfPath } from "../layout20Fixture"

describe.skipIf( !layout20PdfPath )( "parseSwimmingPdfLayout20 with the Hertfordshire 2027 PDF", () => {
  it( "imports QT columns and excludes unavailable 10/11 distance times", async () => {
    const text = await extractPdfText( readFileSync( requireLayout20PdfPath() ) )
    const result = parseSwimmingPdfLayout20( text )

    expect( result ).toHaveLength( 252 )
    expect( new Set( result.map( row => `${row.gender}:${row.event}` ) ) ).toHaveLength( 36 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )

    expect( result ).toContainEqual( {
      gender: "male",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "00:35.00",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      age: "12",
      time: "03:20.48",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "16+",
      time: "02:33.72",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Freestyle 800m",
      age: "11",
      time: null,
    } ) )
    expect( result ).not.toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Freestyle 50m",
      age: "10",
      time: "00:37.80",
    } ) )
  }, 30_000 )
} )
