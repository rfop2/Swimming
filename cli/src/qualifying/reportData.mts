import { prepareStatement, COUNTIES, REGIONS } from "lib"
import type { Pool, QualifyingSource, QualifyingStagingRow, QualifyingPeriodStagingRow } from "lib"

const areaName = ( code: string ): string => COUNTIES[code] ?? REGIONS[code] ?? code

// ---------- times ----------

interface KeyedTimeRow {
  key: string
  scope: string
  area: string
  type: string
  gender: string
  age: string
  course: string
  stroke: string
  distance: string
  timeString: string
  time: number
}

const timeRowKey = ( row: Pick<QualifyingStagingRow, "scope" | "area" | "type" | "gender" | "age" | "course" | "stroke" | "distance"> ): string =>
  [ row.scope, row.area, row.type, row.gender, row.age, row.course, row.stroke, row.distance ].join( "|" )

const toKeyedTimeRow = ( row: QualifyingStagingRow ): KeyedTimeRow => ( {
  key: timeRowKey( row ),
  scope: row.scope,
  area: row.area,
  type: row.type,
  gender: row.gender,
  age: row.age,
  course: row.course,
  stroke: row.stroke,
  distance: row.distance,
  timeString: row.timeString,
  time: row.time,
} )

export type TimeDiffCategory = "missing-value" | "format-issue" | "value-diff"

// swimming-times.com/swimturn.com's own timeString formatting is always the app
// convention ("SS.ss" or "M:SS.ss"); a live row that doesn't match this shape
// (e.g. "00:00:42" instead of "0:42.50") indicates the live import corrupted the
// value, not a genuine standards disagreement. A 0-second time is a placeholder,
// not a real "instant" swim.
const TIME_FORMAT_RE = /^\d{1,3}(:\d{2})?\.\d{1,2}$/

const categorizeTimeDiff = ( aTimeString: string | undefined, bTimeString: string | undefined, aSeconds: number | undefined, bSeconds: number | undefined ): TimeDiffCategory => {
  if ( aSeconds === 0 || bSeconds === 0 ) return "missing-value"
  if ( !aTimeString || !bTimeString || !TIME_FORMAT_RE.test( aTimeString ) || !TIME_FORMAT_RE.test( bTimeString ) ) return "format-issue"
  return "value-diff"
}

export type TimeDiffStatus = "match" | "differ" | "only-in-a" | "only-in-b"

export interface TimeDiffRow {
  areaCode: string
  areaName: string
  scope: string
  type: string
  gender: string
  age: string
  course: string
  stroke: string
  distance: string
  status: TimeDiffStatus
  aTimeString?: string
  bTimeString?: string
  deltaSeconds?: number
  category?: TimeDiffCategory
}

export interface TimeDiffResult {
  aLabel: string
  bLabel: string
  counts: { match: number, differ: number, onlyA: number, onlyB: number }
  diffs: TimeDiffRow[] // non-match rows only
}

const diffTimeRows = ( aLabel: string, bLabel: string, aRows: KeyedTimeRow[], bRows: KeyedTimeRow[] ): TimeDiffResult => {
  const a = new Map( aRows.map( r => [ r.key, r ] ) )
  const b = new Map( bRows.map( r => [ r.key, r ] ) )
  const keys = new Set( [ ...a.keys(), ...b.keys() ] )
  const counts = { match: 0, differ: 0, onlyA: 0, onlyB: 0 }
  const diffs: TimeDiffRow[] = []

  for ( const key of keys ) {
    const ra = a.get( key )
    const rb = b.get( key )
    // Compare on the numeric time, not timeString — the two sources/live don't agree on
    // decimal-place formatting ("1:35.2" vs "1:35.20") for an identical time, which would
    // otherwise show up as a false "differ".
    const same = !!ra && !!rb && Math.abs( ra.time - rb.time ) < 0.005
    const status: TimeDiffStatus = same ? "match" : ra && rb ? "differ" : ra ? "only-in-a" : "only-in-b"
    counts[ status === "match" ? "match" : status === "differ" ? "differ" : status === "only-in-a" ? "onlyA" : "onlyB" ]++
    if ( status === "match" ) continue

    const source = ra ?? rb!
    diffs.push( {
      areaCode: source.area,
      areaName: areaName( source.area ),
      scope: source.scope,
      type: source.type,
      gender: source.gender,
      age: source.age,
      course: source.course,
      stroke: source.stroke,
      distance: source.distance,
      status,
      aTimeString: ra?.timeString,
      bTimeString: rb?.timeString,
      deltaSeconds: ra && rb ? Math.round( ( rb.time - ra.time ) * 100 ) / 100 : undefined,
      category: status === "differ" ? categorizeTimeDiff( ra?.timeString, rb?.timeString, ra?.time, rb?.time ) : undefined,
    } )
  }

  return { aLabel, bLabel, counts, diffs }
}

// ---------- periods ----------

const periodKey = ( row: Pick<QualifyingPeriodStagingRow, "scope" | "area" | "type"> ): string =>
  [ row.scope, row.area, row.type ].join( "|" )

const dateField = ( value: string | null | undefined ): string | undefined => {
  if ( !value ) return undefined
  // DB DATE columns come back as full timestamps (e.g. "2026-01-01T00:00:00.000Z")
  // or already-plain "YYYY-MM-DD" strings depending on the driver — normalize to the latter.
  return value.slice( 0, 10 )
}

export type PeriodDiffStatus = "match" | "differ" | "only-in-staged" | "only-in-live"

export interface PeriodDiffRow {
  areaCode: string
  areaName: string
  scope: string
  type: string
  status: PeriodDiffStatus
  stagedStart?: string
  stagedEnd?: string
  stagedLastRace?: string
  liveStart?: string
  liveEnd?: string
  liveLastRace?: string
}

export interface PeriodDiffResult {
  stagedCount: number
  liveCount: number
  withChampionshipDates: number
  counts: { match: number, differ: number, onlyStaged: number, onlyLive: number }
  diffs: PeriodDiffRow[] // non-match rows only
}

const computePeriodsDiff = async ( pool: Pool, year: number ): Promise<PeriodDiffResult> => {
  const getStaging = prepareStatement<{ source: string, year: number }, QualifyingPeriodStagingRow>(
    pool,
    "SELECT * FROM QualifyingPeriodsStaging WHERE source = 'swimming-times' AND year = :year"
  )
  const staged = await getStaging.all( { source: "swimming-times", year } )

  const getLive = prepareStatement<{ year: number }, QualifyingPeriodStagingRow>(
    pool,
    "SELECT * FROM QualifyingPeriods WHERE year = :year"
  )
  const live = await getLive.all( { year } )
  const liveByKey = new Map( live.map( r => [ periodKey( r ), r ] ) )

  const diffs: PeriodDiffRow[] = []
  let match = 0
  let onlyStaged = 0

  for ( const row of staged ) {
    const liveRow = liveByKey.get( periodKey( row ) )
    const stagedStart = dateField( row.qualifyingStart )
    const stagedEnd = dateField( row.qualifyingEnd )
    const stagedLastRace = dateField( row.lastRaceDate )

    if ( !liveRow ) {
      onlyStaged++
      diffs.push( {
        areaCode: row.area, areaName: areaName( row.area ), scope: row.scope, type: row.type,
        status: "only-in-staged", stagedStart, stagedEnd, stagedLastRace,
      } )
      continue
    }

    const liveStart = dateField( liveRow.qualifyingStart )
    const liveEnd = dateField( liveRow.qualifyingEnd )
    const liveLastRace = dateField( liveRow.lastRaceDate )
    const same = stagedStart === liveStart && stagedEnd === liveEnd && stagedLastRace === liveLastRace

    if ( same ) {
      match++
      continue
    }
    diffs.push( {
      areaCode: row.area, areaName: areaName( row.area ), scope: row.scope, type: row.type,
      status: "differ", stagedStart, stagedEnd, stagedLastRace, liveStart, liveEnd, liveLastRace,
    } )
  }

  const onlyLive = live.length - ( staged.length - onlyStaged )
  return {
    stagedCount: staged.length,
    liveCount: live.length,
    withChampionshipDates: staged.filter( r => r.lastRaceDate ).length,
    counts: { match, differ: diffs.length - onlyStaged, onlyStaged, onlyLive },
    diffs,
  }
}

// ---------- top-level report data ----------

export interface SwimturnVersionMismatch {
  areaCode: string
  areaName: string
  scope: string
  sourceYear: number | null
  sourceUrl: string | null
}

export interface QualifyingReportData {
  year: number
  generatedAt: string
  sources: QualifyingSource[]
  totals: { swimmingTimes: number, swimturn: number, live: number }
  timesStVsSw?: TimeDiffResult
  timesVsLive: Partial<Record<QualifyingSource, TimeDiffResult>>
  swimturnVersionMismatches: SwimturnVersionMismatch[]
  periods?: PeriodDiffResult
}

export const buildQualifyingReportData = async ( pool: Pool, year: number, sources: QualifyingSource[] ): Promise<QualifyingReportData> => {
  const stagingBySource = new Map<QualifyingSource, KeyedTimeRow[]>()

  for ( const source of sources ) {
    const getStaging = prepareStatement<{ source: string, year: number }, QualifyingStagingRow>(
      pool,
      "SELECT * FROM QualifyingTimesStaging WHERE source = :source AND year = :year"
    )
    const rows = await getStaging.all( { source, year } )
    stagingBySource.set( source, rows.map( toKeyedTimeRow ) )
  }

  const getLive = prepareStatement<{ year: number }, QualifyingStagingRow>(
    pool,
    "SELECT * FROM QualifyingTimes WHERE year = :year"
  )
  const liveRows = ( await getLive.all( { year } ) ).map( toKeyedTimeRow )

  const timesStVsSw = sources.includes( "swimming-times" ) && sources.includes( "swimturn" )
    ? diffTimeRows( "swimming-times", "swimturn", stagingBySource.get( "swimming-times" ) ?? [], stagingBySource.get( "swimturn" ) ?? [] )
    : undefined

  const timesVsLive: Partial<Record<QualifyingSource, TimeDiffResult>> = {}
  for ( const source of sources ) {
    timesVsLive[source] = diffTimeRows( source, "live", stagingBySource.get( source ) ?? [], liveRows )
  }

  let swimturnVersionMismatches: SwimturnVersionMismatch[] = []
  if ( sources.includes( "swimturn" ) ) {
    const getVersionMismatch = prepareStatement<{ source: string, year: number }, { area: string, scope: string, sourceYear: number | null, sourceUrl: string | null }>(
      pool,
      `SELECT DISTINCT area, scope, sourceYear, sourceUrl FROM QualifyingTimesStaging
       WHERE source = :source AND year = :year AND (sourceYear IS NULL OR sourceYear != :year)`
    )
    const rows = await getVersionMismatch.all( { source: "swimturn", year } )
    swimturnVersionMismatches = rows.map( r => ( { areaCode: r.area, areaName: areaName( r.area ), scope: r.scope, sourceYear: r.sourceYear, sourceUrl: r.sourceUrl } ) )
  }

  const periods = sources.includes( "swimming-times" ) ? await computePeriodsDiff( pool, year ) : undefined

  return {
    year,
    generatedAt: new Date().toISOString(),
    sources,
    totals: {
      swimmingTimes: stagingBySource.get( "swimming-times" )?.length ?? 0,
      swimturn: stagingBySource.get( "swimturn" )?.length ?? 0,
      live: liveRows.length,
    },
    timesStVsSw,
    timesVsLive,
    swimturnVersionMismatches,
    periods,
  }
}
