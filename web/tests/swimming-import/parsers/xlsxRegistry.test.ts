import { describe, expect, it } from "vitest"
import { getXlsxParser, xlsxParserRegistry } from "../../../server/utils/swimming-import/parsers/xlsx/registry"

describe( "XLSX parser registry", () => {
  it( "registers the generic, Wiltshire and Cambridgeshire spreadsheet layouts", () => {
    expect( Object.keys( xlsxParserRegistry ) ).toEqual( [ "xlsx", "layout19", "layout26" ] )
  } )

  it( "returns the selected parser and rejects unknown layouts", () => {
    expect( getXlsxParser( "layout19" ) ).toBe( xlsxParserRegistry.layout19 )
    expect( getXlsxParser( "layout26" ) ).toBe( xlsxParserRegistry.layout26 )
    expect( getXlsxParser( "layout99" ) ).toBeUndefined()
  } )
} )
