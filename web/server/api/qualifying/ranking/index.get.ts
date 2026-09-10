import type { CourseType, QualifyingRow } from "lib"
import { getPool, prepareStatement } from "lib"
import { buildQualifyingRanking } from "../../../utils/qualifyingRanking"

interface RankingQuery {
  year?: string
  age?: string
  course?: string
  stroke?: string
  distance?: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const query = getQuery<RankingQuery>( event )
  const year = Number( query.year )

  if ( !Number.isInteger( year ) || !query.age || ![ "lc", "sc" ].includes( query.course ?? "" ) || !query.stroke || !query.distance ) {
    throw createError( {
      status: 400,
      message: "Year, age, course, stroke and distance are required."
    } )
  }

  const params = {
    year,
    age: query.age,
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

  return buildQualifyingRanking( rows, query.course as CourseType )
} )
