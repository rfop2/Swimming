import { describe, expect, it } from "vitest"
import {
  getPdfParser,
  pdfParserRegistry,
} from "../../../server/utils/swimming-import/parsers/registry"

describe( "PDF parser registry", () => {
  it( "registers every supported PDF layout", () => {
    expect( Object.keys( pdfParserRegistry ) ).toEqual( [
      "layout1",
      "layout2",
      "layout3",
      "layout4",
      "layout5",
      "layout6",
      "layout7",
      "layout8",
      "layout9",
      "layout10",
      "layout11",
      "layout12",
      "layout13",
      "layout14",
      "layout15",
      "layout16",
      "layout17",
      "layout18",
      "layout20",
      "layout21",
      "layout22",
      "layout23",
      "layout25",
      "layout28",
      "layout32",
    ] )
  } )

  it( "returns the selected parser and rejects unknown layouts", () => {
    expect( getPdfParser( "layout7" ) ).toBe( pdfParserRegistry.layout7 )
    expect( getPdfParser( "layout99" ) ).toBeUndefined()
  } )
} )
