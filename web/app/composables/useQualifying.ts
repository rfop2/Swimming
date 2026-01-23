import { type Swimmer, getSwimmerAge, type ExtQualifyingPeriod, type QualifyingRow } from "lib"
// import { FetchError } from "ofetch"

interface QualifyingInfo extends ExtQualifyingPeriod {
  times: QualifyingRow[]
}

const today = Temporal.Now.plainDateISO()

export const useQualifying = () => {

  const qualifyingTimes = useState<QualifyingRow[]>( "qualifyingTimes", () => [] )
  const loadedTimes = useState( "timesLoaded", () => false )
  const loadingTimes = useState( "timesLoading", () => false )

  const fetchQualifyingTimes = async () => {
    if ( loadingTimes.value ) return
    loadingTimes.value = true

    try {
      qualifyingTimes.value = await $fetch( "/api/qualifying/times" )
      loadedTimes.value = true
    } finally {
      loadingTimes.value = false
    }
  }

  fetchQualifyingTimes()

  const qualifyingPeriods = useState<ExtQualifyingPeriod[]>( "qualifyingPeriods", () => [] )
  const loadedPeriods = useState( "periodsLoaded", () => false )
  const loadingPeriods = useState( "periodsLoading", () => false )

  const fetchQualifyingPeriods = async () => {
    if ( loadingPeriods.value ) return
    loadingPeriods.value = true

    try {
      qualifyingPeriods.value = await $fetch( "/api/qualifying/dates" )
      loadedPeriods.value = true
    } finally {
      loadingPeriods.value = false
    }
  }

  fetchQualifyingPeriods()

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
    const swimmerAge = getSwimmerAge( swimmer )
    const filteredQualifyingTimes = qualifyingTimes.filter( qt => {
      if ( ( qt.gender !== swimmer.gender ) )
        return false
      if ( ( qt.scope === "regional" && qt.area !== swimmer.region ) || ( qt.scope === "county" && qt.area !== swimmer.county ) )
        return false
      const yearAge = swimmerAge + ( qt.year - today.year )
      const periodAge = yearAge > 18 ? "Open" : String( yearAge )
      if ( ( qt.age !== periodAge ) )
        return false
      return true
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
  } as const
}
