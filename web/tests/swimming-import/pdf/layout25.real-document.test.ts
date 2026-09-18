import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout25 } from "../../../server/utils/swimming-import/parsers/pdf/layout25"
import { layout25PdfPath, requireLayout25PdfPath } from "../layout25Fixture"

describe.skipIf( !layout25PdfPath )( "parseSwimmingPdfLayout25 with the South West Winter 2026 PDF", () => {
  it( "imports both genders and expands the shared 13/14 age group", async () => {
    const text = await extractPdfText( readFileSync( requireLayout25PdfPath() ) )
    const result = parseSwimmingPdfLayout25( text )

    expect( result ).toHaveLength( 180 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 36 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 0 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "13",
      time: "27.30",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "14",
      time: "27.30",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      age: "16",
      time: "2:55.00",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Individual Medley 400m",
      distance: "400m",
      stroke: "Individual Medley",
      age: "17+",
      time: "5:00.00",
    } )
  }, 30_000 )

  it( "does not return the fixed table for an unrelated PDF", () => {
    expect( parseSwimmingPdfLayout25( "Unrelated regional times" ) ).toEqual( [] )
  } )
} )
