import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../../../server/utils/swimming-import/pdf/extractPdfText"
import { parseSwimmingPdfLayout29 } from "../../../server/utils/swimming-import/parsers/pdf/layout29"
import { layout29PdfPath, requireLayout29PdfPath } from "../layout29Fixture"

describe.skipIf( !layout29PdfPath )( "parseSwimmingPdfLayout29 with the Cornwall 2027 PDF", () => {
  it( "imports QT rows, excludes consideration values and applies the age-11 long-distance rule", async () => {
    const text = await extractPdfText( readFileSync( requireLayout29PdfPath() ) )
    const result = parseSwimmingPdfLayout29( text )

    expect( result ).toHaveLength( 288 )
    expect( result.filter( row => row.time === null ) ).toHaveLength( 6 )
    expect( new Set( result.map( row => `${row.gender}:${row.course}:${row.event}` ) ) ).toHaveLength( 36 )

    expect( result ).toContainEqual( {
      gender: "male",
      course: "sc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "40.08",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      age: "12",
      time: "03:39.3",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      course: "sc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      age: "17+",
      time: "02:37.0",
    } )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Freestyle 800m",
      age: "10",
      time: null,
    } ) )
    expect( result ).toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Freestyle 800m",
      age: "11",
      time: "12:50.0",
    } ) )
    expect( result ).not.toContainEqual( expect.objectContaining( {
      gender: "male",
      event: "Freestyle 50m",
      age: "10",
      time: "43.33",
    } ) )
  }, 30_000 )
} )
