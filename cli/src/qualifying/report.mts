import { buildQualifyingReportData } from "./reportData.mjs"
import type { Pool, QualifyingSource } from "lib"
import type { TimeDiffResult, PeriodDiffResult, QualifyingReportData } from "./reportData.mjs"

export { buildQualifyingReportData }
export type { QualifyingReportData }

const printTimeDiffTable = ( result: TimeDiffResult, includeCategory: boolean ) => {
  const { aLabel, bLabel, counts, diffs } = result
  console.log( `-- ${aLabel} vs ${bLabel} -- match:${counts.match} differ:${counts.differ} only-${aLabel}:${counts.onlyA} only-${bLabel}:${counts.onlyB}` )
  if ( !diffs.length ) return
  console.table( diffs.map( d => ( {
    area: d.areaCode, scope: d.scope, type: d.type, gender: d.gender, age: d.age,
    course: d.course, stroke: d.stroke, distance: d.distance, status: d.status,
    [aLabel]: d.aTimeString ?? "-",
    [bLabel]: d.bTimeString ?? "-",
    ...( includeCategory ? { category: d.category ?? "-" } : {} ),
  } ) ) )
}

const printPeriodsTable = ( result: PeriodDiffResult, year: number ) => {
  console.log( `\n=== Qualifying periods report for ${year} ===` )
  console.log( `  swimming-times: ${result.stagedCount} staged periods` )
  console.log( `  live QualifyingPeriods: ${result.liveCount} rows\n` )
  console.log( `-- swimming-times vs live -- match:${result.counts.match} differ:${result.counts.differ} only-in-staged:${result.counts.onlyStaged} only-in-live:${result.counts.onlyLive}` )
  if ( result.diffs.length ) {
    console.table( result.diffs.map( d => ( {
      area: d.areaCode, scope: d.scope, type: d.type, status: d.status,
      "staged start": d.stagedStart ?? "-", "staged end": d.stagedEnd ?? "-", "staged lastRace": d.stagedLastRace ?? "-",
      "live start": d.liveStart ?? "-", "live end": d.liveEnd ?? "-", "live lastRace": d.liveLastRace ?? "-",
    } ) ) )
  }
  console.log( `\n  ${result.withChampionshipDates}/${result.stagedCount} staged periods have an explicit championship-dates lastRaceDate; the rest are left null` )
}

export const printQualifyingReportData = ( data: QualifyingReportData ): void => {
  console.log( `\n=== Qualifying times report for ${data.year} ===` )
  if ( data.totals.swimmingTimes ) console.log( `  swimming-times: ${data.totals.swimmingTimes} staged rows` )
  if ( data.totals.swimturn ) console.log( `  swimturn: ${data.totals.swimturn} staged rows` )
  console.log( `  live QualifyingTimes: ${data.totals.live} rows\n` )

  if ( data.timesStVsSw ) printTimeDiffTable( data.timesStVsSw, false )

  for ( const source of data.sources ) {
    const result = data.timesVsLive[source]
    if ( result ) printTimeDiffTable( result, true )
  }

  if ( data.swimturnVersionMismatches.length ) {
    console.log( `\n-- swimturn leagues whose source year != ${data.year} --` )
    console.table( data.swimturnVersionMismatches.map( m => ( {
      area: m.areaCode, scope: m.scope, sourceYear: m.sourceYear, sourceUrl: m.sourceUrl,
    } ) ) )
  }

  if ( data.periods ) printPeriodsTable( data.periods, data.year )
}

export const printQualifyingDiffReport = async ( pool: Pool, year: number, sources: QualifyingSource[] ): Promise<void> => {
  const data = await buildQualifyingReportData( pool, year, sources )
  printQualifyingReportData( data )
}
