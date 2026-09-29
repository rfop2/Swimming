import { Temporal } from "temporal-polyfill"
import { convertTime, getPool, getSwimmerAge, prepareStatement } from "lib"
import type { CourseType, DistanceType, QualifyingPeriodRow, QualifyingRow, QualifyingType, ScopeType, StrokeType, Swimmer } from "lib"

// "open" – the qualifying window is currently running.
// "closed" – the qualifying window has ended but the last race date for the
// competition hasn't passed, so times swum within the window still count.
export type QualificationPeriodStatus = "open" | "closed"

export interface QualificationPeriod {
  year: number
  scope: ScopeType
  area: string
  type: QualifyingType
  qualifyingStart: string
  qualifyingEnd: string | null
  lastRaceDate: string | null
  status: QualificationPeriodStatus
}

export interface QualificationEntry {
  course: CourseType
  stroke: StrokeType
  distance: DistanceType
  qualifyingTime: number
  // Qualifying time was converted from the other course's standard
  qualifyingConverted: boolean
  bestTime: number
  bestDate: string
  bestMeet: string
  bestLevel: number | null
  qualified: boolean
  // bestTime - qualifyingTime (negative when qualified)
  difference: number
}

export interface SwimmerQualifications {
  periods: { period: QualificationPeriod, entries: QualificationEntry[] }[]
}

interface ResultSwim {
  course: CourseType
  stroke: StrokeType
  distance: DistanceType
  time: string
  date: string
  meet: string
  level: number | null
}

const courses: CourseType[] = [ "lc", "sc" ]

// When false, a period whose qualifying window has ended but has no lastRaceDate
// is hidden. When true, it is shown as "closed" until a newer period of the same
// scope/type starts.
export const SHOW_ENDED_PERIODS_WITHOUT_LAST_RACE_DATE = false

// When false, a period with no qualifyingEnd is hidden. When true, it is treated
// as open indefinitely until a newer period of the same scope/type starts.
export const SHOW_PERIODS_WITHOUT_END_DATE = false

// Whether a qualifying time's age group ("12", "17+", "10-11", "Open") covers
// a swimmer of the given competition age.
export const qualifyingAgeMatches = ( age: string, swimmerAge: number ) => {
  if ( age === "Open" ) return swimmerAge > 18
  const plus = /^(\d+)\+$/.exec( age )
  if ( plus ) return swimmerAge >= Number( plus[1] )
  const range = /^(\d+)-(\d+)$/.exec( age )
  if ( range ) return swimmerAge >= Number( range[1] ) && swimmerAge <= Number( range[2] )
  return Number( age ) === swimmerAge
}

const convert = ( from: CourseType, to: CourseType, stroke: StrokeType, distance: DistanceType, time: number ) => {
  try {
    return Math.round( convertTime( from, to, stroke, distance, time ) * 100 ) / 100
  } catch {
    return undefined
  }
}

// For each scope/type, picks the most recent qualifying period that is either
// open or closed-but-still-before-its-last-race-date (open wins), then finds the
// swimmer's best result within that period's qualifying window for each event
// that has a qualifying standard.
export const getSwimmerQualifications = async ( swimmer: Swimmer, today = Temporal.Now.plainDateISO() ): Promise<SwimmerQualifications> => {
  const pool = await getPool()

  const selectPeriods = prepareStatement<Swimmer & { today: string }, QualifyingPeriodRow>(
    pool, `
      SELECT
        *
      FROM
        QualifyingPeriods
      WHERE
        ( (scope = 'regional' AND area = :region) OR (scope = 'county' AND area = :county))
        AND qualifyingStart IS NOT NULL
        AND qualifyingStart <= :today
      ORDER BY
        qualifyingStart ASC
    ;`
  )
  const selectTimes = prepareStatement<Swimmer, QualifyingRow>(
    pool, `
      SELECT
        *
      FROM
        QualifyingTimes
      WHERE
        ( (scope = 'regional' AND area = :region) OR (scope = 'county' AND area = :county))
        AND (gender = :gender)
    ;`
  )
  const selectResults = prepareStatement<{ swimmerId: string, startDate: string }, ResultSwim>(
    pool, `
      SELECT
        course, stroke, distance, time, date, meet, level
      FROM
        Results
      WHERE
        swimmer = :swimmerId
        AND time IS NOT NULL
        AND date >= :startDate
    ;`
  )

  const swimmerAge = getSwimmerAge( swimmer )

  const [ periodRows, timeRows ] = await Promise.all( [ selectPeriods.all( { ...swimmer, today: today.toString() } ), selectTimes.all( swimmer ) ] )

  const periodTimes = ( period: QualifyingPeriodRow ) => timeRows.filter( time => (
    time.year === period.year &&
      time.scope === period.scope &&
      time.area === period.area &&
      time.type === period.type &&
      qualifyingAgeMatches( time.age, swimmerAge + ( time.year - today.year ) )
  ) )

  // Select one period per scope/type — later periods overwrite earlier ones as
  // rows are ordered by qualifyingStart, and open overwrites closed.
  const selected = new Map<string, { period: QualificationPeriod, times: QualifyingRow[] }>()
  for ( const status of [ "closed", "open" ] as const ) {
    for ( const row of periodRows ) {
      if ( !row.qualifyingEnd && !SHOW_PERIODS_WITHOUT_END_DATE ) continue

      const ended = !!row.qualifyingEnd && Temporal.PlainDate.compare( today, row.qualifyingEnd ) > 0
      const lastRaceDatePassed = row.lastRaceDate
        ? Temporal.PlainDate.compare( today, row.lastRaceDate ) > 0
        : !SHOW_ENDED_PERIODS_WITHOUT_LAST_RACE_DATE
      const rowStatus = !ended ? "open" : ( !lastRaceDatePassed ? "closed" : undefined )
      if ( rowStatus !== status ) continue

      const times = periodTimes( row )
      if ( !times.length ) continue

      selected.set( `${row.scope}_${row.type}`, {
        period: {
          year: row.year,
          scope: row.scope,
          area: row.area,
          type: row.type,
          qualifyingStart: row.qualifyingStart,
          qualifyingEnd: row.qualifyingEnd ?? null,
          lastRaceDate: row.lastRaceDate ?? null,
          status,
        },
        times,
      } )
    }
  }

  if ( !selected.size ) return { periods: [] }

  const earliestStart = [ ...selected.values() ]
    .map( ( { period } ) => period.qualifyingStart )
    .sort()[0]!
  const results = await selectResults.all( { swimmerId: swimmer.id, startDate: earliestStart } )

  const periods = [ ...selected.values() ].map( ( { period, times } ) => {
    const windowEnd = period.qualifyingEnd && period.qualifyingEnd < today.toString() ? period.qualifyingEnd : today.toString()
    const windowResults = results.filter( result => result.date >= period.qualifyingStart && result.date <= windowEnd )

    const entries: QualificationEntry[] = []
    const events = new Set( times.map( time => `${time.stroke}_${time.distance}` ) )
    for ( const event of events ) {
      const [ stroke, distance ] = event.split( "_" ) as [ StrokeType, DistanceType ]
      for ( const course of courses ) {
        // Prefer the standard for this course, else convert the other course's
        const sameCourse = times.find( time => time.course === course && time.stroke === stroke && time.distance === distance )
        const otherCourse = sameCourse ? undefined : times.find( time => time.stroke === stroke && time.distance === distance )
        const qualifyingTime = sameCourse
          ? Number( sameCourse.time )
          : otherCourse && convert( otherCourse.course, course, stroke, distance, Number( otherCourse.time ) )
        if ( !qualifyingTime ) continue

        const best = windowResults
          .filter( result => result.course === course && result.stroke === stroke && result.distance === distance )
          .reduce<ResultSwim | undefined>( ( best, result ) => ( !best || Number( result.time ) < Number( best.time ) ? result : best ), undefined )
        if ( !best ) continue

        const bestTime = Number( best.time )
        entries.push( {
          course,
          stroke,
          distance,
          qualifyingTime,
          qualifyingConverted: !sameCourse,
          bestTime,
          bestDate: best.date,
          bestMeet: best.meet,
          bestLevel: best.level,
          qualified: bestTime <= qualifyingTime,
          difference: Math.round( ( bestTime - qualifyingTime ) * 100 ) / 100,
        } )
      }
    }
    return { period, entries }
  } )

  return { periods }
}
