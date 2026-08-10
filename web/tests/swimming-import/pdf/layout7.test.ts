import { describe, expect, it } from "vitest"
import { parseSwimmingPdfLayout7 } from "../../../server/utils/swimming-import/parsers/pdf/layout7"

describe( "parseSwimmingPdfLayout7", () => {
  it( "parses inline and multiline Berkshire qualifying times", () => {
    const text = `
      Berkshire qualifying times
      FEMALE
      Age 10/11 12 13 14 15 16 17+
      50m Freestyle
      40.00 39.00 38.00 37.00 36.00 35.00 34.00
      800m Freestyle 10:00.00 9:50.00 9:40.00 9:30.00 9:20.00 9:10.00
      OPEN / MALE
      100m IM 1:20.50 1:18.50 1:16.50 1:14.50 1:12.50 1:10.50 1:08.50
    `

    const result = parseSwimmingPdfLayout7( text )

    expect( result ).toHaveLength( 24 )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "40.00",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "11",
      time: "40.00",
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Freestyle 800m",
      distance: "800m",
      stroke: "Freestyle",
      age: "10",
      time: null,
    } )
    expect( result ).toContainEqual( {
      gender: "female",
      event: "Freestyle 800m",
      distance: "800m",
      stroke: "Freestyle",
      age: "12",
      time: "00:10:00.00",
    } )
    expect( result ).toContainEqual( {
      gender: "male",
      event: "Individual Medley 100m",
      distance: "100m",
      stroke: "Individual Medley",
      age: "17+",
      time: "00:01:08.50",
    } )
  } )

  it( "does not parse events before a gender heading", () => {
    const result = parseSwimmingPdfLayout7( `
      50m Freestyle 40.00 39.00 38.00 37.00 36.00 35.00 34.00
      FEMALE
      50m Backstroke 45.00 44.00 43.00 42.00 41.00 40.00 39.00
    ` )

    expect( result ).toHaveLength( 8 )
    expect( result.every( row => row.event === "Backstroke 50m" ) ).toBe( true )
  } )
} )
