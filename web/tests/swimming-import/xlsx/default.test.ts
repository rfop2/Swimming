import { describe, it, expect } from "vitest"
import * as XLSX from "xlsx"
import { parseSwimmingXlsx } from "../../../server/utils/swimming-import/parsers/xlsx/default"

// Mirrors the real Devon-style workbook shape: a header row with the
// distance/stroke label somewhere in the middle columns, then one data row
// per age bracket — leading/trailing label cell, 8 male time cells, a gap
// column, 8 female time cells. Times below cover every format normalizeTime()
// and fixRawTime() need to recognise, including the two that previously lost
// precision: "0140.8" (concatenated MMSS.s, one decimal digit) and "2.48.10"
// (dot-separated M.SS.xx).
const sheetRows = [
  [ "", "", "100m Freestyle", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "" ],
  [
    "50m",
    "0140.8", "0136.9", "0121.0", "0114.1", "0108.2", "0103.8", "0100.4", "1.25.30",
    "",
    "0142.8", "2.48.10", "1.08.20", "0113.1", "0106.3", "0105.8", "0104.5", "42.00",
    "50m",
  ],
]

describe( "parseSwimmingXlsx (default layout)", () => {
  it( "preserves fractional seconds and pads the right side of a decimal tail", () => {
    const sheet = XLSX.utils.aoa_to_sheet( sheetRows )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet( workbook, sheet, "Sheet1" )
    const buffer = XLSX.write( workbook, { type: "buffer", bookType: "xlsx" } )

    const structured = parseSwimmingXlsx( buffer )
    const find = ( gender: "male" | "female", age: string ) =>
      structured.find( r => r.gender === gender && r.age === age && r.event === "100m Freestyle" )?.time

    // "0140.8" -> 1 minute 40, eight TENTHS of a second -> "00:01:40.80", not "00:01:40.08".
    expect( find( "male", "10" ) ).toBe( "00:01:40.80" )
    expect( find( "male", "11" ) ).toBe( "00:01:36.90" )
    // "1.25.30" (dot-separated M.SS.xx, already 2 decimal digits) -> unaffected by the padding fix.
    expect( find( "male", "17+" ) ).toBe( "00:01:25.30" )

    // "2.48.10" (dot-separated M.SS.xx) -> preserves the ".10" hundredths.
    expect( find( "female", "11" ) ).toBe( "00:02:48.10" )
    expect( find( "female", "12" ) ).toBe( "00:01:08.20" )
    // Sub-60s time with no minute component is untouched by normalizeTime.
    expect( find( "female", "17+" ) ).toBe( "42.00" )
  } )
} )
