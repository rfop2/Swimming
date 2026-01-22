import { Temporal } from "temporal-polyfill"
import type { ExtQualifyingPeriod, QualifyingPeriodRow } from "lib"
import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const selectRecords = prepareStatement<unknown, QualifyingPeriodRow>(
    await getPool(),
    "SELECT * FROM QualifyingPeriods"
  )

  const periods = await selectRecords.all()

  const today = Temporal.Now.plainDateISO()

  const result: ExtQualifyingPeriod[] = periods
    .map( period => {
      const qualifyingStarted = !!( period.qualifyingStart && Temporal.PlainDate.compare( period.qualifyingStart, today ) <= 0 )
      const qualifyingEnded = !!( period.qualifyingEnd && Temporal.PlainDate.compare( today, period.qualifyingEnd ) > 0 )
      const qualifyingActive = !!( qualifyingStarted && ( period.qualifyingEnd && !qualifyingEnded ) )
      const eligibilityStarted = !!( period.eligibilityStart && Temporal.PlainDate.compare( period.eligibilityStart, today ) <= 0 )
      const eligibilityEnded = !!( period.eligibilityEnd && Temporal.PlainDate.compare( today, period.eligibilityEnd ) > 0 )
      const eligibilityActive = !!( eligibilityStarted && ( period.eligibilityEnd && !eligibilityEnded ) )
      return {
        ...period,
        qualifyingStarted,
        qualifyingEnded,
        qualifyingActive,
        eligibilityStarted,
        eligibilityEnded,
        eligibilityActive,
      }
    } )
  return result
} )
