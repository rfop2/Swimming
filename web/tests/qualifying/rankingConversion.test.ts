import type { CourseType, DistanceType, QualifyingRow } from "lib"
import { convertTime } from "lib"
import { describe, expect, it } from "vitest"
import {
  addConvertibleCourseOptions,
  buildQualifyingRanking,
  canConvertCourse,
} from "../../server/utils/qualifyingRanking"

const qualifyingRow = ( overrides: Partial<QualifyingRow> = {} ): QualifyingRow => ( {
  year: 2027,
  course: "lc",
  stroke: "freestyle",
  distance: "100m",
  scope: "county",
  area: "surrey",
  type: "general",
  gender: "male",
  age: "12",
  timeString: "1:02.00",
  time: 62,
  ...overrides,
} )

describe( "qualification ranking course conversion", () => {
  it( "prefers an original time for the selected course", () => {
    const ranking = buildQualifyingRanking( [
      qualifyingRow( { course: "lc", time: 65 } ),
      qualifyingRow( { course: "sc", time: 50 } ),
    ], "lc" )

    expect( ranking ).toHaveLength( 1 )
    expect( ranking[0] ).toMatchObject( {
      time: 65,
      course: "lc",
      sourceCourse: "lc",
      converted: false,
    } )
  } )

  it( "converts the other course when the selected course is missing", () => {
    const source = qualifyingRow( { course: "sc", time: 60 } )
    const ranking = buildQualifyingRanking( [ source ], "lc" )

    expect( ranking[0] ).toMatchObject( {
      time: convertTime( "sc", "lc", "freestyle", "100m", 60 ),
      course: "lc",
      sourceCourse: "sc",
      converted: true,
    } )
  } )

  it( "also converts Long Course times when Short Course is selected", () => {
    const source = qualifyingRow( { course: "lc", time: 65 } )
    const ranking = buildQualifyingRanking( [ source ], "sc" )

    expect( ranking[0] ).toMatchObject( {
      time: convertTime( "lc", "sc", "freestyle", "100m", 65 ),
      course: "sc",
      sourceCourse: "lc",
      converted: true,
    } )
  } )

  it( "ranks each gender after normalising times", () => {
    const ranking = buildQualifyingRanking( [
      qualifyingRow( { area: "surrey", course: "sc", time: 62 } ),
      qualifyingRow( { area: "kent", course: "lc", time: 62 } ),
      qualifyingRow( { area: "essex", gender: "female", course: "sc", time: 64 } ),
    ], "lc" )

    const maleRows = ranking.filter( row => row.gender === "male" )
    expect( maleRows.map( row => row.area ) ).toEqual( [ "kent", "surrey" ] )
    expect( maleRows.map( row => row.position ) ).toEqual( [ 1, 2 ] )
    expect( ranking.find( row => row.gender === "female" )?.position ).toBe( 1 )
  } )

  it( "adds the equivalent course to filter options when conversion is supported", () => {
    const options = addConvertibleCourseOptions( [ {
      year: 2027,
      gender: "male" as const,
      age: "12",
      course: "sc" as CourseType,
      stroke: "freestyle" as const,
      distance: "100m" as const,
    } ] )

    expect( options.map( option => option.course ).sort() ).toEqual( [ "lc", "sc" ] )
  } )

  it( "does not offer an invalid 25m to Long Course conversion", () => {
    expect( canConvertCourse( "sc", "lc", "freestyle", "25m" as DistanceType ) ).toBe( false )
  } )
} )
