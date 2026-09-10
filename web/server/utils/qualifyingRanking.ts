import type { CourseType, DistanceType, QualifyingRow, StrokeType } from "lib"
import { convertTime, secondsToTime } from "lib"

export interface QualifyingRankingRow extends QualifyingRow {
  converted: boolean
  sourceCourse: CourseType
  position: number
  difference: number
}

interface CourseOption {
  course: CourseType
  stroke: StrokeType
  distance: DistanceType
}

const otherCourse = ( course: CourseType ): CourseType => course === "lc" ? "sc" : "lc"

export const canConvertCourse = ( fromCourse: CourseType, toCourse: CourseType, stroke: StrokeType, distance: DistanceType ) => {
  try {
    convertTime( fromCourse, toCourse, stroke, distance, 60 )
    return true
  } catch {
    return false
  }
}

export const addConvertibleCourseOptions = <T extends CourseOption>( rows: T[] ): T[] => {
  const options = new Map<string, T>()

  for ( const row of rows ) {
    const key = JSON.stringify( row )
    options.set( key, row )

    const course = otherCourse( row.course )
    if ( canConvertCourse( row.course, course, row.stroke, row.distance ) ) {
      const convertedOption = { ...row, course }
      options.set( JSON.stringify( convertedOption ), convertedOption )
    }
  }

  return Array.from( options.values() )
}

const normaliseRow = ( row: QualifyingRow, selectedCourse: CourseType ): QualifyingRankingRow | undefined => {
  const sourceCourse = row.course
  const converted = sourceCourse !== selectedCourse

  try {
    const time = converted
      ? convertTime( sourceCourse, selectedCourse, row.stroke, row.distance, row.time )
      : Number( row.time )

    return {
      ...row,
      course: selectedCourse,
      time,
      timeString: converted ? secondsToTime( time ) : row.timeString,
      converted,
      sourceCourse,
      position: 0,
      difference: 0,
    }
  } catch {
    return undefined
  }
}

export const buildQualifyingRanking = ( rows: QualifyingRow[], selectedCourse: CourseType ): QualifyingRankingRow[] => {
  const rowsByArea = new Map<string, QualifyingRow[]>()

  for ( const row of rows ) {
    const key = `${row.gender}:${row.scope}:${row.area}`
    const areaRows = rowsByArea.get( key ) ?? []
    areaRows.push( row )
    rowsByArea.set( key, areaRows )
  }

  const fastestByArea: QualifyingRankingRow[] = []

  for ( const areaRows of rowsByArea.values() ) {
    const matchingCourseRows = areaRows.filter( row => row.course === selectedCourse )
    const candidates = matchingCourseRows.length ? matchingCourseRows : areaRows
    const normalisedRows = candidates
      .map( row => normaliseRow( row, selectedCourse ) )
      .filter( ( row ): row is QualifyingRankingRow => !!row )
      .sort( ( a, b ) => a.time - b.time || a.type.localeCompare( b.type ) )

    if ( normalisedRows[0] ) fastestByArea.push( normalisedRows[0] )
  }

  const rankedRows = fastestByArea.sort( ( a, b ) => {
    const genderDifference = a.gender.localeCompare( b.gender )
    if ( genderDifference ) return genderDifference
    const timeDifference = a.time - b.time
    if ( timeDifference ) return timeDifference
    const scopeDifference = a.scope.localeCompare( b.scope )
    return scopeDifference || a.area.localeCompare( b.area )
  } )

  return rankedRows.map( row => {
    const genderRows = rankedRows.filter( candidate => candidate.gender === row.gender )
    const fastest = genderRows[0]?.time ?? row.time
    const firstMatchingTime = genderRows.findIndex( candidate => candidate.time === row.time )

    return {
      ...row,
      position: firstMatchingTime + 1,
      difference: row.time - fastest,
    }
  } )
}
