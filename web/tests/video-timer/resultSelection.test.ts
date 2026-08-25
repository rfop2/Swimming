import { describe, expect, it } from "vitest"
import {
  getVideoTimerResultState,
  parseVideoTimerResult,
  serializeVideoTimerResult,
  type VideoTimerResultSelection,
} from "../../app/utils/videoTimerResult"

const result = ( overrides: Partial<VideoTimerResultSelection> = {} ): VideoTimerResultSelection => ( {
  swimmer: "123456",
  course: "lc",
  stroke: "freestyle",
  distance: "100m",
  seq: 1,
  date: "2026-08-25",
  meet: "County Championships",
  time: 102.48,
  ...overrides,
} )

describe( "video timer result selection", () => {
  it( "serializes and parses a selected result with its official time", () => {
    const selected = result()
    expect( parseVideoTimerResult( serializeVideoTimerResult( selected ) ) ).toEqual( selected )
  } )

  it( "populates and locks Official Time when a result is selected", () => {
    const state = getVideoTimerResultState( serializeVideoTimerResult( result() ) )

    expect( state.officialTime ).toBe( "1:42.48" )
    expect( state.officialTimeLocked ).toBe( true )
  } )

  it( "updates Official Time when the selected result changes", () => {
    const first = getVideoTimerResultState( serializeVideoTimerResult( result() ) )
    const second = getVideoTimerResultState( serializeVideoTimerResult( result( {
      seq: 2,
      meet: "Regional Championships",
      time: 98.23,
    } ) ) )

    expect( first.officialTime ).toBe( "1:42.48" )
    expect( second.officialTime ).toBe( "1:38.23" )
    expect( second.result?.seq ).toBe( 2 )
    expect( second.officialTimeLocked ).toBe( true )
  } )

  it( "clears and unlocks Official Time when the result is cleared", () => {
    const state = getVideoTimerResultState( null )

    expect( state.result ).toBeNull()
    expect( state.officialTime ).toBe( "" )
    expect( state.officialTimeLocked ).toBe( false )
  } )

  it.each( [
    "not-json",
    JSON.stringify( result( { time: 0 } ) ),
    JSON.stringify( { swimmer: "123456" } ),
  ] )( "does not lock Official Time for an invalid result value", value => {
    expect( getVideoTimerResultState( value ) ).toMatchObject( {
      result: null,
      officialTime: "",
      officialTimeLocked: false,
    } )
  } )
} )
