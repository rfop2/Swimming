import type { GenderType, QualifyingPeriodRow, QualifyingType, ScopeType } from "lib"
import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const selectTimes = prepareStatement<unknown[], {
    year: number
    scope: ScopeType
    area: string
    type: QualifyingType
    gender: GenderType
    agesCount: number
    ages: string
    eventsCount: number
    entriesCount: number
  }>(
    await getPool(), `
    SELECT DISTINCT
      year,
      scope,
      area,
      type,
      gender,
      count(DISTINCT age) AS agesCount,
      GROUP_CONCAT( DISTINCT age ORDER BY age) AS ages,
      #GROUP_CONCAT( DISTINCT CONCAT_WS( "-", stroke, distance ) ORDER BY stroke,distance) AS evs,
      count(DISTINCT course,stroke,distance) AS eventsCount,
      count(*) AS entriesCount
    FROM
      QualifyingTimes
    GROUP BY
      year,
      scope,
      area,
      type,
      gender
    ORDER BY
      year,
      scope,
      area,
      type,
      gender
    ;`
  )
  const times = await selectTimes.all()

  const selectPeriods = prepareStatement<unknown[], QualifyingPeriodRow>(
    await getPool(), `
    SELECT DISTINCT
      *
    FROM
      QualifyingPeriods
    ORDER BY
      year,
      scope,
      area,
      type
    ;`
  )
  const periods = await selectPeriods.all()

  return {
    periods,
    times
  }
} )
