import type { CourseType, DistanceType, GenderType, StrokeType } from "lib"
import { getPool, prepareStatement } from "lib"
import { addConvertibleCourseOptions } from "../../../utils/qualifyingRanking"

interface RankingOption {
  year: number
  gender: GenderType
  age: string
  course: CourseType
  stroke: StrokeType
  distance: DistanceType
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const selectOptions = prepareStatement<unknown[], RankingOption>(
    await getPool(),
    `
      SELECT DISTINCT
        year,
        gender,
        age,
        course,
        stroke,
        distance
      FROM
        QualifyingTimes
      WHERE
        time > 0
      ORDER BY
        year DESC,
        gender,
        age,
        course,
        stroke,
        CAST(distance AS UNSIGNED)
    ;`
  )

  return addConvertibleCourseOptions( await selectOptions.all() )
} )
