import { describe, expect, it } from "vitest"
import { getXlsxParser, xlsxParserRegistry } from "../../../server/utils/swimming-import/parsers/xlsx/registry"

describe( "XLSX parser registry", () => {
  it( "registers the supported spreadsheet layouts", () => {
    expect( Object.keys( xlsxParserRegistry ) ).toEqual( [ "xlsx", "layout19", "layout26", "layout27", "layout30" ] )
  } )

  it( "returns the selected parser and rejects unknown layouts", () => {
    expect( getXlsxParser( "layout19" ) ).toBe( xlsxParserRegistry.layout19 )
    expect( getXlsxParser( "layout26" ) ).toBe( xlsxParserRegistry.layout26 )
    expect( getXlsxParser( "layout27" ) ).toBe( xlsxParserRegistry.layout27 )
    expect( getXlsxParser( "layout30" ) ).toBe( xlsxParserRegistry.layout30 )
    expect( getXlsxParser( "layout99" ) ).toBeUndefined()
  } )
} )
