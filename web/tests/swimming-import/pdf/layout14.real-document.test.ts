import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout14 } from "../../../server/utils/swimming-import/parsers/pdf/layout14"
import { layout14PdfPath, requireLayout14PdfPath } from "../layout14Fixture"

describe.skipIf( !layout14PdfPath )( "parseSwimmingPdfLayout14 with the Norfolk 2027 PDF", () => {
  it( "extracts the complete document and representative times", async () => {
    const text = await extractPdfText( readFileSync( requireLayout14PdfPath() ) )
    const result = parseSwimmingPdfLayout14( text )

    expect( result ).toHaveLength( 272 )
    expect( new Set( result.map( row => `${row.gender}:${row.event}` ) ) ).toHaveLength( 34 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )

    expect( result ).toContainEqual( {
      gender: "male",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "41.52",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      age: "17+",
      time: "58.40",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "13",
      time: "3:01.75",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Individual Medley 400m",
      distance: "400m",
      stroke: "Individual Medley",
      age: "10",
      time: null,
    } )
  }, 30_000 )
} )
