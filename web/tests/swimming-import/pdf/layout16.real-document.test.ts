import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout16 } from "../../../server/utils/swimming-import/parsers/pdf/layout16"
import { layout16PdfPath, requireLayout16PdfPath } from "../layout16Fixture"

describe.skipIf( !layout16PdfPath )( "parseSwimmingPdfLayout16 with the Leicestershire 2027 PDF", () => {
  it( "extracts the complete document and representative times", async () => {
    const text = await extractPdfText( readFileSync( requireLayout16PdfPath() ) )
    const result = parseSwimmingPdfLayout16( text )

    expect( result ).toHaveLength( 252 )
    expect( new Set( result.map( row => `${row.gender}:${row.event}` ) ) ).toHaveLength( 36 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )

    expect( result ).toContainEqual( {
      gender: "male",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "42.50",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      age: "16+",
      time: "1:09.90",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "13",
      time: "3:05.80",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      event: "Freestyle 800m",
      distance: "800m",
      stroke: "Freestyle",
      age: "10",
      time: null,
    } )
  }, 30_000 )
} )
