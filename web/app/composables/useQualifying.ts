import type { InternalApi } from "nitropack"
import type { Swimmer, ExtQualifyingPeriod, QualifyingRow, IndividualStats, ScopeType, QualifyingType } from "lib"
import { Temporal } from "temporal-polyfill"

export interface QualifyingInfo extends ExtQualifyingPeriod {
  times: QualifyingRow[]
}

type SwimmerQualifyingResponse = InternalApi["/api/qualifying/swimmer/:id"]["get"]

export const useQualifying = () => {
  // Keyed per swimmer id — each swimmer's qualifying periods/times are fetched
  // (and cached) individually via /api/qualifying/swimmer/:id, rather than
  // downloading every qualifying time in the system and filtering client-side.
  const swimmerQualifying = useState<Record<string, SwimmerQualifyingResponse>>( "swimmerQualifying", () => ( {} ) )
  const loadingSwimmerIds = useState<Set<string>>( "swimmerQualifyingLoading", () => new Set() )
  // Loading flags are transient — reset on client so a fetch started (but not
  // completed) during SSR doesn't permanently block the client-side fetch.
  if ( import.meta.client ) loadingSwimmerIds.value = new Set()

  const fetchSwimmerQualifying = async ( swimmerId: string ) => {
    if ( swimmerQualifying.value[swimmerId] || loadingSwimmerIds.value.has( swimmerId ) ) return
    loadingSwimmerIds.value.add( swimmerId )

    try {
      swimmerQualifying.value[swimmerId] = await $fetch<SwimmerQualifyingResponse>( `/api/qualifying/swimmer/${swimmerId}` )
    } catch {
      // silently fail — caller has no session, swimmer not found, or endpoint unavailable
      swimmerQualifying.value[swimmerId] = []
    } finally {
      loadingSwimmerIds.value.delete( swimmerId )
    }
  }

  const validateQualifyingSwimDate = ( qualifyingInfo: QualifyingInfo, swimRecord: IndividualStats ) => {
    const swimDate = Temporal.PlainDate.from( String( swimRecord.date ) )
    if ( Temporal.PlainDate.compare( swimDate, Temporal.PlainDate.from( qualifyingInfo.qualifyingStart ) ) < 0 )
      return false
    if ( qualifyingInfo.qualifyingEnd && Temporal.PlainDate.compare( swimDate, Temporal.PlainDate.from( qualifyingInfo.qualifyingEnd ) ) > 0 )
      return false
    return true
  }

  const findSwimQualifyingEntry = ( qualifyingTimes: QualifyingRow[], swimRecord: IndividualStats ) => {
    const courseQualifyingEntry = qualifyingTimes.find( entry => (
      entry.course === swimRecord.course &&
        entry.stroke === swimRecord.stroke &&
        entry.distance === swimRecord.distance
    ) )
    if ( courseQualifyingEntry )
      return courseQualifyingEntry
    const qualifyingEntry = qualifyingTimes.find( entry => (
      entry.stroke === swimRecord.stroke &&
        entry.distance === swimRecord.distance
    ) )
    return qualifyingEntry
  }

  // For a given swimmer, resolves the single most relevant qualifying period (and
  // its matching times) per scope/type — preferring a currently-active period over
  // one that's only in its post-qualifying eligibility window, matching the
  // precedence swimmers actually compete under. Periods with no matching times for
  // this swimmer (wrong age/gender/area) are skipped entirely.
  const calcActiveQualifyingPeriods = ( swimmer?: Swimmer ) => {
    const activeQualifyingPeriods: Record<ScopeType, Partial<Record<QualifyingType, { age: string, year: number, period?: QualifyingInfo } | undefined>>> = {
      county: {},
      regional: {},
    }

    if ( !swimmer ) return activeQualifyingPeriods

    fetchSwimmerQualifying( swimmer.id ).catch( () => {} )
    const entries = swimmerQualifying.value[swimmer.id] ?? []

    const assign = ( entry: SwimmerQualifyingResponse[number] ) => {
      if ( !entry.times.length ) return
      activeQualifyingPeriods[entry.period.scope as ScopeType][entry.period.type as QualifyingType] = {
        age: entry.times[0]!.age,
        year: entry.period.year,
        period: { ...entry.period, times: entry.times },
      }
    }

    // Eligible periods first, then currently-active ones — active wins where both exist.
    for ( const entry of entries ) {
      if ( entry.period.eligibilityActive ) assign( entry )
    }
    for ( const entry of entries ) {
      if ( entry.period.qualifyingActive ) assign( entry )
    }

    return activeQualifyingPeriods
  }

  return {
    fetchSwimmerQualifying,
    validateQualifyingSwimDate,
    findSwimQualifyingEntry,
    calcActiveQualifyingPeriods,
  } as const
}
