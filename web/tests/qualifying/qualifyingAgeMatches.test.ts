import { describe, expect, it } from "vitest"
import { qualifyingAgeMatches } from "../../server/utils/swimmerQualifications"

describe( "qualifyingAgeMatches", () => {
  it( "matches exact ages", () => {
    expect( qualifyingAgeMatches( "12", 12 ) ).toBe( true )
    expect( qualifyingAgeMatches( "12", 13 ) ).toBe( false )
  } )

  it( "matches open-ended age groups", () => {
    expect( qualifyingAgeMatches( "17+", 16 ) ).toBe( false )
    expect( qualifyingAgeMatches( "17+", 17 ) ).toBe( true )
    expect( qualifyingAgeMatches( "17+", 21 ) ).toBe( true )
  } )

  it( "matches age ranges", () => {
    expect( qualifyingAgeMatches( "10-11", 9 ) ).toBe( false )
    expect( qualifyingAgeMatches( "10-11", 10 ) ).toBe( true )
    expect( qualifyingAgeMatches( "10-11", 11 ) ).toBe( true )
    expect( qualifyingAgeMatches( "10-11", 12 ) ).toBe( false )
  } )

  it( "matches Open only for swimmers over 18", () => {
    expect( qualifyingAgeMatches( "Open", 18 ) ).toBe( false )
    expect( qualifyingAgeMatches( "Open", 19 ) ).toBe( true )
  } )
} )
