import { describe, expect, it } from "vitest"
import { getXlsxParser, xlsxParserRegistry } from "../../../server/utils/swimming-import/parsers/xlsx/registry"

describe( "XLSX parser registry", () => {
  it( "registers every supported spreadsheet layout", () => {
    expect( Object.keys( xlsxParserRegistry ) ).toEqual( [ "xlsx", "layout19", "layout24" ] )
  } )

  it( "returns the selected parser and rejects unknown layouts", () => {
    expect( getXlsxParser( "layout19" ) ).toBe( xlsxParserRegistry.layout19 )
    expect( getXlsxParser( "layout24" ) ).toBe( xlsxParserRegistry.layout24 )
    expect( getXlsxParser( "layout99" ) ).toBeUndefined()
  } )
} )
