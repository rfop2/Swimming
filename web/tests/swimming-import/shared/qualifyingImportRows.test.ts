import { describe, expect, it } from "vitest"
import { mapQualifyingImportRows } from "../../../app/utils/qualifyingImportRows"

describe( "mapQualifyingImportRows", () => {
  it( "excludes null, empty, and whitespace-only times from the import payload", () => {
    const created = new Date( "2026-08-25T12:00:00Z" )
    const baseRow = {
      gender: "male",
      event: "100m Freestyle",
      distance: "100m",
      stroke: "Freestyle",
      age: "10",
    }

    const result = mapQualifyingImportRows(
      [
        { ...baseRow, age: "10", time: "1:02.34" },
        { ...baseRow, age: "11", time: null },
        { ...baseRow, age: "12", time: "" },
        { ...baseRow, age: "13", time: "   " },
      ],
      {
        year: 2027,
        course: "lc",
        scope: "county",
        area: "DVNW",
        type: "general",
      },
      created
    )

    expect( result ).toEqual( [ {
      created,
      year: 2027,
      course: "lc",
      scope: "county",
      area: "DVNW",
      gender: "male",
      age: "10",
      distance: "100m",
      stroke: "freestyle",
      timeString: "1:02.34",
      time: 62.34,
      type: "general",
    } ] )
  } )
} )
