import type { QualifyingRow } from "lib"
import { getPool, prepareStatement } from "lib"

interface RankingQuery {
  year?: string
  age?: string
  course?: string
  stroke?: string
  distance?: string
}

export interface QualifyingRankingRow extends QualifyingRow {
  position: number
  difference: number
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const query = getQuery<RankingQuery>( event )
  const year = Number( query.year )

  if ( !Number.isInteger( year ) || !query.age || !query.course || !query.stroke || !query.distance ) {
    throw createError( {
      status: 400,
      message: "Year, age, course, stroke and distance are required."
    } )
  }

  const params = {
    year,
    age: query.age,
    course: query.course,
    stroke: query.stroke,
    distance: query.distance,
  }

  const selectTimes = prepareStatement<typeof params, QualifyingRow>(
    await getPool(),
    `
      SELECT
        *
      FROM
        QualifyingTimes
      WHERE
        year = :year AND
        age = :age AND
        course = :course AND
        stroke = :stroke AND
        distance = :distance AND
        time > 0
      ORDER BY
        gender,
        time,
        scope,
        area,
        type
    ;`
  )

  const rows = await selectTimes.all( params )

  // An area can contain more than one championship type (for example,
  // regional summer and winter standards). The ranking is by County/Region,
  // so retain only that area's fastest standard for each gender.
  const fastestByArea = new Map<string, QualifyingRow>()
  for ( const row of rows ) {
    const key = `${row.gender}:${row.scope}:${row.area}`
    if ( !fastestByArea.has( key ) ) fastestByArea.set( key, row )
  }

  const rankedRows = Array.from( fastestByArea.values() ).sort( ( a, b ) => {
    const genderDifference = a.gender.localeCompare( b.gender )
    if ( genderDifference ) return genderDifference
    const timeDifference = Number( a.time ) - Number( b.time )
    if ( timeDifference ) return timeDifference
    const scopeDifference = a.scope.localeCompare( b.scope )
    return scopeDifference || a.area.localeCompare( b.area )
  } )

  return rankedRows.map( ( row, _index, allRankedRows ) => {
    const genderRows = allRankedRows.filter( candidate => candidate.gender === row.gender )
    const fastest = genderRows[0]?.time ?? row.time
    const firstMatchingTime = genderRows.findIndex( candidate => Number( candidate.time ) === Number( row.time ) )

    return {
      ...row,
      time: Number( row.time ),
      position: firstMatchingTime + 1,
      difference: Number( row.time ) - Number( fastest ),
    } satisfies QualifyingRankingRow
  } )
} )
