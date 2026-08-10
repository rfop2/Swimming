import { describe, expect, it } from "vitest"
import { normalizeTime } from "../../../server/utils/swimming-import/shared/normalizeTime"

describe( "normalizeTime", () => {
  it.each( [
    [ null, null ],
    [ "40,25", "40.25" ],
    [ "1.33:0", "00:01:33.0" ],
    [ "1:05", "1.05" ],
    [ "2.48.10", "00:02:48.10" ],
    [ "1:20.50", "00:01:20.50" ],
    [ "1:02:03", "01:02:03" ],
  ] )( "normalizes %s to %s", ( input, expected ) => {
    expect( normalizeTime( input ) ).toBe( expected )
  } )
} )
