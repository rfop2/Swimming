import type { Swimmer, ExtQualifyingPeriod, QualifyingRow, IndividualStats, ScopeType, QualifyingType } from "lib"
import { getSwimmerAge } from "lib"
// import { FetchError } from "ofetch"

export interface QualifyingInfo extends ExtQualifyingPeriod {
  times: QualifyingRow[]
}

const today = Temporal.Now.plainDateISO()

export const useQualifying = () => {

  const qualifyingTimes = useState<QualifyingRow[]>( "qualifyingTimes", () => [] )
  const loadedTimes = useState( "timesLoaded", () => false )
  const loadingTimes = useState( "timesLoading", () => false )
  // Loading flags are transient — reset on client so a fetch started (but not completed)
  // during SSR doesn't permanently block the client-side fetch.
  if ( import.meta.client ) loadingTimes.value = false

  const fetchQualifyingTimes = async () => {
    if ( loadedTimes.value || loadingTimes.value ) return
    loadingTimes.value = true

    try {
      qualifyingTimes.value = await $fetch<QualifyingRow[]>( "/api/qualifying/times" )
      loadedTimes.value = true
    } catch {
      // silently fail — caller has no session or endpoint unavailable
    } finally {
      loadingTimes.value = false
    }
  }

  fetchQualifyingTimes().catch( () => {} )

  const qualifyingPeriods = useState<ExtQualifyingPeriod[]>( "qualifyingPeriods", () => [] )
  const loadedPeriods = useState( "periodsLoaded", () => false )
  const loadingPeriods = useState( "periodsLoading", () => false )
  if ( import.meta.client ) loadingPeriods.value = false

  const fetchQualifyingPeriods = async () => {
    if ( loadedPeriods.value || loadingPeriods.value ) return
    loadingPeriods.value = true

    try {
      qualifyingPeriods.value = await $fetch<ExtQualifyingPeriod[]>( "/api/qualifying/dates" )
      loadedPeriods.value = true
    } catch {
      // silently fail — caller has no session or endpoint unavailable
    } finally {
      loadingPeriods.value = false
    }
  }

  fetchQualifyingPeriods().catch( () => {} )

  const buildQualifyingInfo = ( qualifyingPeriods: ExtQualifyingPeriod[], qualifyingTimes: QualifyingRow[] ) => {
    const qualifyingInfo = qualifyingPeriods.map( qp => ( {
      ...qp,
      times: qualifyingTimes.filter( qt =>
        qt.scope === qp.scope && qt.area === qp.area && qt.type === qp.type && qt.year === qp.year
      ),
    } ) )
    console.log( "qi", qualifyingInfo )
    return qualifyingInfo
  }

  const filterCurrentQualifyingPeriods = <T extends ExtQualifyingPeriod>( qualifyingPeriods: T[] ): T[] => {
    const filteredQualifyingPeriods = qualifyingPeriods.filter( qp => qp.qualifyingActive )
    // Sort by start date
    filteredQualifyingPeriods.sort( ( a, b ) => a.qualifyingStart.localeCompare( b.qualifyingStart ) )
    console.log( "cqp", filteredQualifyingPeriods )
    return filteredQualifyingPeriods
  }

  const filterEligibleQualifyingPeriods = <T extends ExtQualifyingPeriod>( qualifyingPeriods: T[] ): T[] => {
    const filteredQualifyingPeriods = qualifyingPeriods.filter( qp => qp.eligibilityActive )
    // Sort by start date
    filteredQualifyingPeriods.sort( ( a, b ) => a.eligibilityStart.localeCompare( b.eligibilityStart ) )
    console.log( "eqp", filteredQualifyingPeriods )
    return filteredQualifyingPeriods
  }

  const filterSwimmerQualifyingPeriods = <T extends ExtQualifyingPeriod>( qualifyingPeriods: T[], swimmer: Swimmer ): T[] => {
    if ( !swimmer )
      return []
    const filteredQualifyingPeriods = qualifyingPeriods.filter( qp => {
      // Limit qualifying periods to swimmer's areas
      if ( ( qp.scope === "regional" && qp.area !== swimmer.region ) || ( qp.scope === "county" && qp.area !== swimmer.county ) )
        return false
      return true
    } )
    console.log( "sqp", filteredQualifyingPeriods )
    return filteredQualifyingPeriods
  }

  const filterSwimmerQualifyingTimes = ( qualifyingTimes: QualifyingRow[], swimmer: Swimmer ) => {
    if ( !swimmer )
      return []
    const swimmerAge = getSwimmerAge( swimmer )
    const startYear = today.year - ( swimmerAge - 10 )
    const filteredQualifyingTimes = qualifyingTimes.filter( qt => {
      if ( ( qt.gender !== swimmer.gender ) )
        return false
      if ( ( qt.scope === "regional" && qt.area !== swimmer.region ) || ( qt.scope === "county" && qt.area !== swimmer.county ) )
        return false
      let year = startYear
      do {
        const yearAge = swimmerAge + ( year - today.year )
        const qualAge = yearAge > 18 ? "Open" : String( yearAge )
        if ( ( qt.age === qualAge ) && ( qt.year === year ) ) {
          // console.log( "QQ", year, qt.year, yearAge, qualAge, qt.age )
          return true
        }
      } while ( ++year <= today.year )
      return false
    } )
    console.log( "sqt", filteredQualifyingTimes )
    return filteredQualifyingTimes
  }

  const filterSwimmerCurrentQualifyingInfo = ( qualifyingInfo: QualifyingInfo[], swimmer: Swimmer ) => {
    const filteredPeriods = filterCurrentQualifyingPeriods( qualifyingInfo )
    const filteredQualifyingInfo = filteredPeriods.map( ( qi ) => {
      return {
        ...qi,
        times: filterSwimmerQualifyingTimes( qi.times, swimmer )
      }
    } )
    console.log( "fqi", filteredQualifyingInfo )
    return filteredQualifyingInfo
  }

  const filterSwimmerEligibleQualifyingInfo = ( qualifyingInfo: QualifyingInfo[], swimmer: Swimmer ) => {
    const filteredPeriods = filterEligibleQualifyingPeriods( qualifyingInfo )
    const filteredQualifyingInfo = filteredPeriods.map( ( qi ) => {
      return {
        ...qi,
        times: filterSwimmerQualifyingTimes( qi.times, swimmer )
      }
    } )
    console.log( "fqi", filteredQualifyingInfo )
    return filteredQualifyingInfo
  }

  const filterQualifyingInfoType = ( qualifyingInfo: QualifyingInfo[], scope: string, type: string ) => {
    if ( !qualifyingInfo || !qualifyingInfo.length )
      return []
    return qualifyingInfo.filter( qi => qi.scope === scope && qi.type === type )
  }

  const validateQualifyingSwimDate = ( qualifyingInfo: QualifyingInfo,  swimRecord: IndividualStats ) => {
    const swimDate = Temporal.PlainDate.from( String( swimRecord.date ) )
    if ( Temporal.PlainDate.compare( swimDate, Temporal.PlainDate.from( qualifyingInfo.qualifyingStart ) ) < 0 )
      return false
    if ( qualifyingInfo.qualifyingEnd && Temporal.PlainDate.compare( swimDate, Temporal.PlainDate.from( qualifyingInfo.qualifyingEnd ) ) > 0 )
      return false
    return true
  }

  const findSwimQualifyingEntry = ( qualifyingTimes: QualifyingRow[],  swimRecord: IndividualStats ) => {
    const courseQualifyingEntry = qualifyingTimes.find( entry => (
      entry.course === swimRecord.course &&
        entry.stroke === swimRecord.stroke &&
        entry.distance === swimRecord.distance
    ) )
    console.log( "cqe", courseQualifyingEntry )
    if ( courseQualifyingEntry )
      return courseQualifyingEntry
    const qualifyingEntry = qualifyingTimes.find( entry => (
      entry.stroke === swimRecord.stroke &&
        entry.distance === swimRecord.distance
    ) )
    return qualifyingEntry
  }

  const swimmerQualifyingAge = ( swimmer: Swimmer, year: number ) => {
    if ( !swimmer )
      return ""
    const age = getSwimmerAge( swimmer )
    const yearAge = age + ( year - today.year )
    return yearAge > 18 ? "Open" : String( yearAge )
  }

  const calcActiveQualifyingPeriods = ( swimmer?: Swimmer ) => {
    const currentQualifyingPeriods = computed( () => filterCurrentQualifyingPeriods( qualifyingPeriods.value ) )
    const eligibleQualifyingPeriods = computed( () => filterEligibleQualifyingPeriods( qualifyingPeriods.value ) )

    const swimmerCurrentQualifyingPeriods = computed( () => swimmer ? filterSwimmerQualifyingPeriods( currentQualifyingPeriods.value, swimmer ) : [] )
    const swimmerEligibleQualifyingPeriods = computed( () => swimmer ? filterSwimmerQualifyingPeriods( eligibleQualifyingPeriods.value, swimmer ) : [] )

    const activeQualifyingPeriods: Record<ScopeType, Partial<Record<QualifyingType, { age: string, year: number, period?: QualifyingInfo } | undefined>>> = {
      county: {
        // general: { age: defaultAge, year: today.year },
      },
      regional: {
        // winter: { age: defaultAge, year: today.year },
        // summer: { age: defaultAge, year: today.year },
      },
    }

    if ( swimmer ) {
      const swimmerQualifyingTimes = computed( () => swimmer ? filterSwimmerQualifyingTimes( qualifyingTimes.value, swimmer ) : [] )
      const swimmerCurrentQualifyingInfo = computed( () => buildQualifyingInfo( swimmerCurrentQualifyingPeriods.value, swimmerQualifyingTimes.value ) )
      const swimmerEligibleQualifyingInfo = computed( () => buildQualifyingInfo( swimmerEligibleQualifyingPeriods.value, swimmerQualifyingTimes.value ) )

      if ( swimmerEligibleQualifyingInfo.value ) {
        for ( const qp of swimmerEligibleQualifyingInfo.value ) {
          if ( qp.times.length ) {
            activeQualifyingPeriods[qp.scope as ScopeType][qp.type as QualifyingType] = {
              age: swimmerQualifyingAge( swimmer, qp.year ),
              year: qp.year,
              period: qp
            }
          }
        }
      }
      if ( swimmerCurrentQualifyingInfo.value ) {
        for ( const qp of swimmerCurrentQualifyingInfo.value ) {
          if ( qp.times.length ) {
            activeQualifyingPeriods[qp.scope][qp.type] = {
              age: swimmerQualifyingAge( swimmer, qp.year ),
              year: qp.year,
              period: qp
            }
          }
        }
      }
    }
    console.log( "aqp", activeQualifyingPeriods )
    return activeQualifyingPeriods
  }

  return {
    qualifyingTimes,
    qualifyingPeriods,
    fetchQualifyingTimes,
    fetchQualifyingPeriods,
    buildQualifyingInfo,
    filterCurrentQualifyingPeriods,
    filterEligibleQualifyingPeriods,
    filterSwimmerQualifyingPeriods,
    filterSwimmerQualifyingTimes,
    filterSwimmerCurrentQualifyingInfo,
    filterSwimmerEligibleQualifyingInfo,
    filterQualifyingInfoType,
    validateQualifyingSwimDate,
    findSwimQualifyingEntry,
    calcActiveQualifyingPeriods,
  } as const
}
