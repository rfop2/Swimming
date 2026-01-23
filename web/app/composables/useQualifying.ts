import { type Swimmer, getSwimmerAge, type ExtQualifyingPeriod, type QualifyingRow, type IndividualStats } from "lib"
// import { FetchError } from "ofetch"

export interface QualifyingInfo extends ExtQualifyingPeriod {
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
  } as const
}
