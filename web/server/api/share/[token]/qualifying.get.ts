import { Temporal } from "temporal-polyfill"
import { getPool, prepareStatement, type QualifyingPeriodRow, type QualifyingRow } from "lib"
import type { ExtQualifyingPeriod } from "lib"

export default defineEventHandler( async ( event ) => {
  const token = getRouterParam( event, "token" )
  if ( !token ) {
    throw createError( { status: 400 } )
  }

  await validateShareToken( token )

  const pool = await getPool()
  const today = Temporal.Now.plainDateISO()

  const selectPeriods = prepareStatement<unknown, QualifyingPeriodRow>(
    pool,
    "SELECT * FROM QualifyingPeriods"
  )
  const rawPeriods = await selectPeriods.all()
  const periods: ExtQualifyingPeriod[] = rawPeriods.map( period => {
    const qualifyingStarted = !!( period.qualifyingStart && Temporal.PlainDate.compare( period.qualifyingStart, today ) <= 0 )
    const qualifyingEnded = !!( period.qualifyingEnd && Temporal.PlainDate.compare( today, period.qualifyingEnd ) > 0 )
    const qualifyingActive = !!( qualifyingStarted && ( period.qualifyingEnd && !qualifyingEnded ) )
    const lastRaceDatePassed = !!( period.lastRaceDate && Temporal.PlainDate.compare( today, period.lastRaceDate ) > 0 )
    const eligibilityActive = !!( qualifyingEnded && period.lastRaceDate && !lastRaceDatePassed )
    return { ...period, qualifyingStarted, qualifyingEnded, qualifyingActive, eligibilityActive }
  } )

  const selectTimes = prepareStatement<unknown[], QualifyingRow>(
    pool,
    "SELECT * FROM QualifyingTimes"
  )
  const times = await selectTimes.all()

  return { periods, times }
} )
