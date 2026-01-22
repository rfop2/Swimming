import { Temporal } from "temporal-polyfill"
import { getPool, getSwimmerAge, prepareStatement } from "lib"
import type { Swimmer, QualifyingRow, QualifyingPeriodRow, ExtQualifyingPeriod } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const swimmerId = getRouterParam( event, "id" )
  if ( !swimmerId ) {
    throw createError( {
      message: "No swimmer id found",
      status: 400
    } )
  }

  console.log( event.context.session.userId, swimmerId )
  const selectSwimmer = prepareStatement<{ userId: string, swimmerId: string }, Swimmer>(
    await getPool(),
    `SELECT
        id,
        fullName,
        birthday,
        gender,
        nationality,
        region,
        county,
        active
      FROM
        Swimmers
        INNER JOIN UserSwimmers ON (Swimmers.id = UserSwimmers.swimmerId)
      WHERE
        Swimmers.id = :swimmerId AND
        UserSwimmers.userId = :userId`
  )
  const swimmer = await selectSwimmer.get( { userId: event.context.session.userId, swimmerId } )
  if ( !swimmer ) {
    throw createError( {
      message: `Swimmer ${swimmerId} not found`,
      status: 404
    } )
  }
  console.log( swimmer )

  const selectPeriods = prepareStatement<Swimmer, QualifyingPeriodRow>(
    await getPool(), `
      SELECT
        *
      FROM
        QualifyingPeriods
      WHERE
        ( (scope = 'regional' AND area = :region) OR (scope = 'county' AND area = :county))
        AND qualifyingStart IS NOT NULL
        AND qualifyingStart <= CURDATE()
      ORDER BY
        scope ASC,
        qualifyingStart ASC
    ;`
  )
  const periods = await selectPeriods.all( swimmer )

  const selectTimes = prepareStatement<Swimmer, QualifyingRow>(
    await getPool(), `
      SELECT
        *
      FROM
        QualifyingTimes
      WHERE
        ( (scope = 'regional' AND area = :region) OR (scope = 'county' AND area = :county))
        AND (gender = :gender)
    ;`
  )
  const times = await selectTimes.all( swimmer )

  const today = Temporal.Now.plainDateISO()

  const getQualifyingAge = ( year: number ) => {
    const age = getSwimmerAge( swimmer )
    const yearAge = age + ( year - today.year )
    return yearAge > 18 ? "Open" : String( yearAge )
  }

  const result: { period: ExtQualifyingPeriod, times: QualifyingRow[] }[] = periods
    .map( period => {
      const qualifyingStarted = !!( period.qualifyingStart && Temporal.PlainDate.compare( period.qualifyingStart, today ) <= 0 )
      const qualifyingEnded = !!( period.qualifyingEnd && Temporal.PlainDate.compare( today, period.qualifyingEnd ) > 0 )
      const eligibilityStarted = !!( period.eligibilityStart && Temporal.PlainDate.compare( period.eligibilityStart, today ) <= 0 )
      const eligibilityEnded = !!( period.eligibilityEnd && Temporal.PlainDate.compare( today, period.eligibilityEnd ) > 0 )
      return {
        ...period,
        qualifyingStarted,
        qualifyingEnded,
        qualifyingActive: qualifyingStarted && !qualifyingEnded,
        eligibilityStarted,
        eligibilityEnded,
        eligibilityActive: eligibilityStarted && !eligibilityEnded,
      }
    } )
    .map( period => ( {
      period,
      times: times.filter( time => {
        if ( time.year !== period.year )
          return false
        if ( time.scope !== period.scope )
          return false
        if ( time.area !== period.area )
          return false
        if ( time.type !== period.type )
          return false
        if ( time.age !== getQualifyingAge( time.year ) )
          return false
        return true
      } )
    } ) )
  return result
} )
