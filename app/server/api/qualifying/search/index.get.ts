import { getPool, prepareStatement, type QualifyingRow, type QualifyingPeriodRow } from "lib"

type Params = {
  year: string | null
  scope: string | null
  area: string | null
  gender: string | null
  age: string | null
  course: string | null
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const query = getQuery<Params>( event )

  const selectPeriods = prepareStatement<Params, QualifyingPeriodRow>(
    await getPool(),
    `
      SELECT
        *
      FROM
        QualifyingPeriods
      WHERE
        (:year = '' OR year = :year) AND
        (:scope = '' OR scope = :scope) AND
        (:area = '' OR area = :area) AND
        (:type = '' OR type = :type)
    ;`
  )
  const period = await selectPeriods.get( query )

  const selectTimes = prepareStatement<Params, QualifyingRow>(
    await getPool(),
    `
      SELECT
        *
      FROM
        QualifyingTimes
      WHERE
        (:year = '' OR year = :year) AND
        (:scope = '' OR scope = :scope) AND
        (:area = '' OR area = :area) AND
        (:type = '' OR type = :type) AND
        (:gender = '' OR gender = :gender) AND
        (:age = '' OR age = :age) AND
        (:course = '' OR course = :course)
    ;`
  )
  const times = await selectTimes.all( query )

  return {
    period,
    times
  }
} )
