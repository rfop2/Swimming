import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout28 } from "../../../server/utils/swimming-import/parsers/pdf/layout28"
import { layout28PdfPath, requireLayout28PdfPath } from "../layout28Fixture"

describe.skipIf( !layout28PdfPath )( "parseSwimmingPdfLayout28 with the Staffordshire 2027 PDF", () => {
  it( "extracts both genders and preserves unavailable 10/11 long-distance times", async () => {
    const text = await extractPdfText( readFileSync( requireLayout28PdfPath() ) )
    const result = parseSwimmingPdfLayout28( text )

    expect( result ).toHaveLength( 272 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 12 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 34 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "00:40.0",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      age: "12",
      time: "03:44.2",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "17+",
      time: "02:41.5",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Individual Medley 400m",
      age: "11",
      time: null,
    } ) )
  }, 30_000 )
} )
