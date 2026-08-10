import { prepareStatement } from "lib"
import type { Pool, QualifyingSource, QualifyingStagingRow } from "lib"

interface KeyedRow {
  key: string
  timeString: string
  time: number
}

const rowKey = ( row: Pick<QualifyingStagingRow, "scope" | "area" | "type" | "gender" | "age" | "course" | "stroke" | "distance"> ): string =>
  [ row.scope, row.area, row.type, row.gender, row.age, row.course, row.stroke, row.distance ].join( "|" )

const toMap = ( rows: KeyedRow[] ): Map<string, KeyedRow> =>
  new Map( rows.map( r => [ r.key, r ] ) )

type DiffStatus = "match" | "differ" | "only-in-a" | "only-in-b"

const diffRows = ( aLabel: string, bLabel: string, aRows: KeyedRow[], bRows: KeyedRow[] ) => {
  const a = toMap( aRows )
  const b = toMap( bRows )
  const keys = new Set( [ ...a.keys(), ...b.keys() ] )
  const counts: Record<DiffStatus, number> = { match: 0, differ: 0, "only-in-a": 0, "only-in-b": 0 }
  const diffs: Array<{ key: string, status: DiffStatus, [k: string]: unknown }> = []

  for ( const key of keys ) {
    const ra = a.get( key )
    const rb = b.get( key )
    let status: DiffStatus
    // Compare on the numeric time, not timeString — the two sources/live don't agree on
    // decimal-place formatting ("1:35.2" vs "1:35.20") for an identical time, which would
    // otherwise show up as a false "differ".
    if ( ra && rb ) status = Math.abs( Number( ra.time ) - Number( rb.time ) ) < 0.005 ? "match" : "differ"
    else status = ra ? "only-in-a" : "only-in-b"
    counts[status]++
    if ( status !== "match" ) {
      diffs.push( {
        key,
        status,
        [aLabel]: ra?.timeString ?? "-",
        [bLabel]: rb?.timeString ?? "-",
      } )
    }
  }

  return { counts, diffs }
}

export const printQualifyingDiffReport = async ( pool: Pool, year: number, sources: QualifyingSource[] ): Promise<void> => {
  const stagingBySource = new Map<QualifyingSource, KeyedRow[]>()

  for ( const source of sources ) {
    const getStaging = prepareStatement<{ source: string, year: number }, QualifyingStagingRow>(
      pool,
      "SELECT * FROM QualifyingTimesStaging WHERE source = :source AND year = :year"
    )
    const rows = await getStaging.all( { source, year } )
    stagingBySource.set( source, rows.map( r => ( { key: rowKey( r ), timeString: r.timeString, time: r.time } ) ) )
  }

  const getLive = prepareStatement<{ year: number }, QualifyingStagingRow>(
    pool,
    "SELECT * FROM QualifyingTimes WHERE year = :year"
  )
  const liveRows = ( await getLive.all( { year } ) ).map( r => ( { key: rowKey( r ), timeString: r.timeString, time: r.time } ) )

  console.log( `\n=== Qualifying times report for ${year} ===` )
  for ( const [ source, rows ] of stagingBySource ) {
    console.log( `  ${source}: ${rows.length} staged rows` )
  }
  console.log( `  live QualifyingTimes: ${liveRows.length} rows\n` )

  if ( sources.includes( "swimming-times" ) && sources.includes( "swimturn" ) ) {
    const { counts, diffs } = diffRows(
      "swimming-times", "swimturn",
      stagingBySource.get( "swimming-times" ) ?? [],
      stagingBySource.get( "swimturn" ) ?? [],
    )
    console.log( `-- swimming-times vs swimturn -- match:${counts.match} differ:${counts.differ} only-swimming-times:${counts["only-in-a"]} only-swimturn:${counts["only-in-b"]}` )
    if ( diffs.length ) console.table( diffs )
  }

  for ( const source of sources ) {
    const { counts, diffs } = diffRows(
      source, "live",
      stagingBySource.get( source ) ?? [],
      liveRows,
    )
    console.log( `-- ${source} vs live -- match:${counts.match} differ:${counts.differ} only-in-${source}:${counts["only-in-a"]} only-in-live:${counts["only-in-b"]}` )
    if ( diffs.length ) console.table( diffs )
  }

  if ( sources.includes( "swimturn" ) ) {
    const getVersionMismatch = prepareStatement<{ source: string, year: number }, { area: string, scope: string, sourceYear: number | null, sourceUrl: string | null }>(
      pool,
      `SELECT DISTINCT area, scope, sourceYear, sourceUrl FROM QualifyingTimesStaging
       WHERE source = :source AND year = :year AND (sourceYear IS NULL OR sourceYear != :year)`
    )
    const mismatches = await getVersionMismatch.all( { source: "swimturn", year } )
    if ( mismatches.length ) {
      console.log( `\n-- swimturn leagues whose source year != ${year} --` )
      console.table( mismatches )
    }
  }
}
