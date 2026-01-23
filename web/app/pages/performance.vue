<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { LinkIcon, ChartBarIcon } from "@heroicons/vue/24/outline"
  import { COUNTIES, type IndividualStats, REGIONS, type Swimmer, convertTime, getSwimmerAge, secondsToTime, strokeSort, type ScopeType, type QualifyingType, generateRankingUrl } from "lib"
  import { differenceInCalendarMonths, format, parseISO } from "date-fns"
  import { FetchError } from "ofetch"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Performance",
    meta: [
      { name: "description", content: "Swimmer times relative to other swimmers and qualification times" }
    ]
  } )

  const { swimmer, updated } = useSwimmer()

  const {
    qualifyingPeriods,
    qualifyingTimes,
    filterCurrentQualifyingPeriods,
    filterEligibleQualifyingPeriods,
    filterSwimmerQualifyingPeriods,
    filterSwimmerQualifyingTimes,
    buildQualifyingInfo,
    findSwimQualifyingEntry,
    validateQualifyingSwimDate,
  } = useQualifying()

  type RelativeApiResponse = InternalApi["/api/relative/:id"]["get"]
  interface TypeDetail {
    qualifyTime?: string
    qualifyDiff?: string
    qualifyProx?: number
    qualified?: boolean
    qualifyType?: string
  }
  interface AreaDetail extends Partial<RelativeApiResponse[number]> {
    url?: URL
    types: Partial<Record<QualifyingType, TypeDetail>>
  }

  type Qualifying = Record<ScopeType, AreaDetail>

  const relativeRecords = ref<RelativeApiResponse>( [] )

  type PersonalApiResponse = InternalApi["/api/personal/:id"]["get"]

  const personalRecords = ref<PersonalApiResponse>( [] )

  const today = Temporal.Now.plainDateISO()

  const getQualifyingAge = ( year: number ) => {
    if ( !swimmer.value )
      return ""
    const age = getSwimmerAge( swimmer.value as Swimmer )
    const yearAge = age + ( year - today.year )
    return yearAge > 18 ? "Open" : String( yearAge )
  }

  watchEffect( async () => {
    if ( swimmer.value ) {
      try {
        relativeRecords.value = await $fetch<RelativeApiResponse>( `/api/relative/${swimmer.value.id}` )
        console.log( "PERFORMANCE", relativeRecords.value )
      } catch ( error ) {
        if ( error instanceof FetchError ) {
          const apiError = error as FetchError
          if ( apiError.status === 404 ) {
            relativeRecords.value = []
          } else {
            throw error
          }
        }
      }
      try {
        personalRecords.value = await $fetch<PersonalApiResponse>( `/api/personal/${swimmer.value.id}` )
        console.log( "PERSONAL", personalRecords.value )
      } catch ( error ) {
        if ( error instanceof FetchError ) {
          const apiError = error as FetchError
          if ( apiError.status === 404 ) {
            personalRecords.value = []
          } else {
            throw error
          }
        }
      }
    }
  } )

  const currentQualifyingPeriods = computed( () => filterCurrentQualifyingPeriods( qualifyingPeriods.value ) )
  const eligibleQualifyingPeriods = computed( () => filterEligibleQualifyingPeriods( qualifyingPeriods.value ) )

  const swimmerCurrentQualifyingPeriods = computed( () => swimmer.value ? filterSwimmerQualifyingPeriods( currentQualifyingPeriods.value, swimmer.value ) : [] )
  const swimmerEligibleQualifyingPeriods = computed( () => swimmer.value ? filterSwimmerQualifyingPeriods( eligibleQualifyingPeriods.value, swimmer.value ) : [] )

  const swimmerQualifyingTimes = computed( () => swimmer.value ? filterSwimmerQualifyingTimes( qualifyingTimes.value, swimmer.value ) : [] )
  const swimmerCurrentQualifyingInfo = computed( () => buildQualifyingInfo( swimmerCurrentQualifyingPeriods.value, swimmerQualifyingTimes.value ) )
  const swimmerEligibleQualifyingInfo = computed( () => buildQualifyingInfo( swimmerEligibleQualifyingPeriods.value, swimmerQualifyingTimes.value ) )

  const activeQualifyingPeriods = computed( () => {
    const activeQualifyingPeriods: Record<ScopeType, Partial<Record<QualifyingType, { age: string, year: number, period?: QualifyingInfo } | undefined>>> = {
      county: {
        // general: { age: defaultAge, year: today.year },
      },
      regional: {
        // winter: { age: defaultAge, year: today.year },
        // summer: { age: defaultAge, year: today.year },
      },
    }
    if ( swimmerEligibleQualifyingInfo.value ) {
      for ( const qp of swimmerEligibleQualifyingInfo.value ) {
        if ( qp.times.length ) {
          activeQualifyingPeriods[qp.scope][qp.type] = {
            age: getQualifyingAge( qp.year ),
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
            age: getQualifyingAge( qp.year ),
            year: qp.year,
            period: qp
          }
        }
      }
    }
    console.log( "aqp", activeQualifyingPeriods )
    return activeQualifyingPeriods
  } )

  watchEffect( () => {
    console.log( "cQP", currentQualifyingPeriods.value )
    console.log( "eQP", eligibleQualifyingPeriods.value )
    console.log( "sQT", swimmerQualifyingTimes.value )
    console.log( "scQP", swimmerCurrentQualifyingPeriods.value )
    console.log( "scQI", swimmerCurrentQualifyingInfo.value )
    console.log( "seQP", swimmerEligibleQualifyingPeriods.value )
    console.log( "seQI", swimmerEligibleQualifyingInfo.value )
    console.log( "aQP", activeQualifyingPeriods.value )
  } )

  interface PersonalQualifyingType extends IndividualStats {
    qtime?: number
    qdate?: string
    key: string
    age: number
    distanceMetres: number
    qualified: Record<ScopeType, Set<QualifyingType>>
    qualifying: Qualifying
  }

  const records = computed( () => {
    try {
      // console.log( "PF", personalRecords.value, relativeRecords.value, yearInfo.value )
      if ( !swimmer.value )
        return []

      const relativeRecordsMap = new Map<string, AreaDetail>( ( relativeRecords.value ?? [] )
        .filter( record => record.scope === "county" || record.scope === "regional" )
        .map( record => {
          const { course, stroke, distance, scope, position, rank, time, time_date, best, best_date, difference } = record
          const key = `${distance}_${stroke}_${course}_${scope}`
          const page = Math.floor( rank / 100 ) + 1
          const url = generateRankingUrl( swimmer.value as Swimmer, course, stroke, distance, scope, page )
          return [ key, {
            url,
            position,
            rank,
            time,
            time_date,
            best,
            best_date,
            difference,
            types: {
            },
          } ]
        } ) )
      console.log( "PerfMap", relativeRecordsMap )

      const qualifyingRecords = ( personalRecords.value ?? [] ).map( record => {
        const { course, stroke, distance, date } = record
        const key = `${distance}_${stroke}_${course}`
        const age = differenceInCalendarMonths( new Date(), new Date( date ) )
        const qualifyingRecord: PersonalQualifyingType = {
          key,
          ...record,
          age,
          distanceMetres: Number( distance.replace( /m$/, "" ) ),
          qualified: {
            county: new Set(),
            regional: new Set(),
          },
          qualifying: {
            county: {
              types: {
                general: {},
              },
            },
            regional: {
              types: {
                summer: {},
                winter: {},
              },
            },
          }
        }
        for ( const scope of Object.keys( qualifyingRecord.qualifying ) ) {
          const relativeRecord = relativeRecordsMap.get( `${key}_${scope}` )
          console.log( "pr", relativeRecord, scope )
          if ( relativeRecord ) {
            qualifyingRecord.qualifying[scope as ScopeType] = { ...relativeRecord, ...qualifyingRecord.qualifying[scope as ScopeType] }
            if ( !qualifyingRecord.qtime || ( relativeRecord.time && relativeRecord.time <= qualifyingRecord.qtime ) ) {
              qualifyingRecord.qtime = relativeRecord.time
              qualifyingRecord.qdate = relativeRecord.time_date
            }
          }
          for ( const type of Object.keys( qualifyingRecord.qualifying[scope as ScopeType].types ) ) {
            const activeQualifyingPeriod = activeQualifyingPeriods.value[scope as ScopeType][type as QualifyingType]
            console.log( "AQP", scope, type, activeQualifyingPeriod )
            if ( activeQualifyingPeriod && activeQualifyingPeriod.period ) {
              let qualified = undefined
              let qualifyRaw = undefined
              let qualifyDiff = undefined
              const currentQualifyingEntry = findSwimQualifyingEntry( activeQualifyingPeriod.period.times, qualifyingRecord )
              console.log( "cQE", currentQualifyingEntry )
              if ( currentQualifyingEntry ) {
                qualifyRaw = currentQualifyingEntry ? convertTime( currentQualifyingEntry.course, course, stroke, distance, currentQualifyingEntry.time ) : undefined
                if ( relativeRecord ) {
                  if ( validateQualifyingSwimDate( activeQualifyingPeriod.period, qualifyingRecord ) ) {
                    qualified = relativeRecord.time && ( relativeRecord.time <= ( qualifyRaw ?? 0 ) )
                    qualifyDiff = relativeRecord.time && qualifyRaw ? relativeRecord.time - qualifyRaw : undefined
                  }
                }
              }
              const qr = qualifyingRecord.qualifying[scope as ScopeType].types[type as QualifyingType]
              if ( qr ) {
                const qualifyTime = qualifyRaw ? secondsToTime( qualifyRaw ) : undefined
                qr.qualifyTime = qualifyTime
                qr.qualifyDiff = qualifyDiff && qualifyDiff > 0 ? secondsToTime( qualifyDiff ) : ""
                qr.qualifyProx = qualifyRaw && qualifyDiff ? 100 * ( qualifyDiff / qualifyRaw ) : undefined
                qr.qualified = !!qualified
                qr.qualifyType = activeQualifyingPeriod.period.qualifyingActive ? "current" : ( activeQualifyingPeriod.period.eligibilityActive ? "eligible" : "none" )
              }
              if ( qualified ) {
                qualifyingRecord.qualified[scope as ScopeType].add( type as QualifyingType )
              }
            }
          }
        }
        if ( qualifyingRecord.qdate ) {
          qualifyingRecord.age = differenceInCalendarMonths( new Date(), new Date( qualifyingRecord.qdate ) )
        }
        return qualifyingRecord
      } )
      console.log( "QR", qualifyingRecords )

      qualifyingRecords.sort( ( a, b ) => {
        if ( a.course < b.course ) {
          return 1
        } else if ( a.course > b.course ) {
          return -1
        }
        if ( strokeSort[a.stroke] < strokeSort[b.stroke] ) {
          return -1
        } else if ( strokeSort[a.stroke] > strokeSort[b.stroke] ) {
          return 1
        }
        if ( a.distanceMetres < b.distanceMetres ) {
          return -1
        } else if ( a.distanceMetres > b.distanceMetres ) {
          return 1
        }
        return 0
      } )
      return qualifyingRecords
    } catch ( error ) {
      console.error( error )
    }
    return []
  } )

  const { updateSort, getSortIcon, sortRecords } = useMultiSort<PersonalQualifyingType>()

  const sortedRecords = computed( () => sortRecords( records.value ) )
  // console.log( "SR", sortedRecords )

  const rankClass = ( rank?: number ) => {
    if ( rank ) {
      if ( rank <= 10 ) {
        return "rank-10"
      } else if ( rank <= 20 ) {
        return "rank-20"
      } else if ( rank <= 50 ) {
        return "rank-50"
      }
    }
    return null
  }

  const proxClass = ( prox?: number ) => {
    if ( prox !== undefined ) {
      if ( prox > 0 && prox <= 5 ) {
        return "qualify-prox-5"
      } else if ( prox > 5 && prox <= 10 ) {
        return "qualify-prox-10"
      }
    }
  }
</script>

<template>
  <StandardPage
    title="Performance"
  >
    <template #description>
      Performance in events relative to the event leader if appearing in top 100 rankings in the last 12 months.
    </template>
    <template #controls>
      <SwimmerSelector
        v-model="swimmer"
        :show-label="false"
      />
      <div class="min-w-24">
        <p class="text-sm pt-1.5">
          Swimmer performance data last updated: {{ updated }}
        </p><p />
      </div>
    </template>
    <template #key>
      Key &ndash; Best times recorded in current qualifying periods. Qualifying times that have been achieved are <span class="px-2 mr-1 qualified" /> highlighted.
      Swim times that are close to the qualifying time have time differences shown <span class="px-2 mr-1 qualify-prox-5" /> if within 5%, and <span class="px-2 mr-1 qualify-prox-10" /> if within 10%.
      Event ranking is in the <span class="px-2 mr-1 rank-10" /> top 10, <span class="px-2 mr-1 rank-20" /> top 20, <span class="px-2 mr-1 rank-50" /> top 50. Times in <span class="time-pb">purple</span> are personal bests.
    </template>
    <div>
      <div
        v-if="swimmer"
        class="inline-block min-w-full py-2 align-middle"
      >
        <table class="min-w-full divide-y divide-gray-300">
          <thead>
            <tr class="divide-x divide-gray-200">
              <th
                scope="col"
                rowSpan="2"
                class="whitespace-nowrap align-bottom pl-2 pr-1 py-1.5 text-right text-sm font-semibold text-gray-900 sm:pl-0"
              >
                Dist.
              </th>
              <th
                scope="col"
                rowSpan="2"
                class="whitespace-nowrap align-bottom px-1 py-1.5 text-left text-sm font-semibold text-gray-900"
              >
                Stroke
              </th>
              <th
                scope="col"
                rowSpan="2"
                class="whitespace-nowrap align-bottom px-1 py-1.5 text-left text-sm font-semibold text-gray-900"
              >
                Course
              </th>
              <th
                scope="col"
                rowSpan="2"
                class="whitespace-nowrap align-bottom px-1 py-1.5 text-sm font-semibold text-gray-900"
              >
                <div
                  class="flex justify-center"
                >
                  <ChartBarIcon class="size-4 text-gray-900" />
                </div>
              </th>
              <th
                scope="col"
                rowSpan="2"
                class="whitespace-nowrap align-bottom px-1 py-1.5 text-right text-sm font-semibold text-gray-900"
              >
                Time
              </th>
              <th
                scope="col"
                rowSpan="2"
                class="sortable whitespace-nowrap align-bottom px-1 py-1.5 text-right text-sm font-semibold text-gray-900"
                @click="updateSort('date')"
              >
                <span>Date</span><i :class="getSortIcon('date')" />
              </th>
              <th
                scope="col"
                colSpan="5"
                class="!border-l-2 !border-gray-400 px-1 py-1.5 text-center text-sm font-semibold text-gray-900"
              >
                County ({{ COUNTIES[swimmer.county] }})
              </th>
              <th
                scope="col"
                colSpan="6"
                class="!border-l-2 !border-gray-400 px-1 py-1.5 text-center text-sm font-semibold text-gray-900"
              >
                Regional ({{ REGIONS[swimmer.region] }})
              </th>
            </tr>
            <tr class="divide-x divide-gray-200">
              <th
                scope="col"
                class="whitespace-nowrap !border-l-2 !border-gray-400 px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Rank
              </th>
              <th
                scope="col"
                class="whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Lead
              </th>
              <th
                scope="col"
                class="whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Diff.
              </th>
              <th
                scope="col"
                class="whitespace-nowrap !border-l-1.5 !border-gray-400 px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Qual.
              </th>
              <th
                scope="col"
                class="whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Diff.
              </th>
              <th
                scope="col"
                class="whitespace-nowrap !border-l-2 !border-gray-400 px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Rank
              </th>
              <th
                scope="col"
                class="whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Lead
              </th>
              <th
                scope="col"
                class="whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Diff.
              </th>
              <th
                scope="col"
                class="whitespace-nowrap !border-l-1.5 !border-gray-400 px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Qual.<br>
                Summer
              </th>
              <th
                scope="col"
                class="whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Diff.
              </th>
              <th
                scope="col"
                class="whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Qual.<br>
                Winter
              </th>
              <th
                scope="col"
                class="whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
              >
                Diff.
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr
              v-for="row in sortedRecords"
              :key="row.key"
              class="divide-x divide-gray-200"
            >
              <td class="whitespace-nowrap py-2 pl-3 pr-2 text-right text-sm font-medium text-gray-900 sm:pl-0">
                {{ row.distance }}
              </td>
              <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-900">
                {{ row.stroke.replace( /_/g, " " ).replace(/\b\w/g, char => char.toUpperCase()) }}
              </td>
              <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-900">
                {{ row.course === "lc" ? "Long" : "Short" }}
              </td>
              <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-900">
                <nuxt-link
                  :href="`/results/${row.course}/${row.stroke}/${row.distance}`"
                >
                  <LinkIcon class="size-3 text-gray-900" />
                </nuxt-link>
              </td>
              <td
                class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
                :class="{ 'time-pb': !row.qtime || row.time === row.qtime }"
              >
                {{ secondsToTime( row.qtime ?? row.time ) }}
              </td>
              <td :class="`whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900 opacity-30 age-${row.age}`">
                {{ format( parseISO( row.qdate ?? row.date ), "yyyy-MM-dd" ) }}
              </td>
              <td
                class="whitespace-nowrap !border-l-2 !border-gray-400 px-2 py-2 text-right text-sm text-gray-900"
                :class="rankClass( row.qualifying.county.rank )"
              >
                <span class="inline-flex items-baseline">
                  {{ row.qualifying.county.rank }}
                  <a
                    v-if="row.qualifying.county.url"
                    target="_blank"
                    rel="noreferrer,nofollow"
                    :href="row.qualifying.county.url.toString()"
                  >
                    <LinkIcon class="size-3 text-gray-900" />
                  </a>
                </span>
              </td>
              <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                <span class="tooltip">{{ row.qualifying.county.best ? secondsToTime( row.qualifying.county.best ) : '' }}<span class="tooltip-text">{{ row.qualifying.county.best_date }}</span></span>
              </td>
              <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                {{ row.qualifying.county.difference ? secondsToTime( row.qualifying.county.difference ) : '' }}
              </td>
              <td
                class="whitespace-nowrap !border-l-1.5 !border-gray-400 px-2 py-2 text-right text-sm text-gray-500"
                :class="[{'qualified': row.qualified.county.has('general')},`qualify-type-${row.qualifying.county.types.general?.qualifyType}`]"
              >
                {{ row.qualifying.county.types.general?.qualifyTime }}
              </td>
              <td
                class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500"
                :class="proxClass( row.qualifying.county.types.general?.qualifyProx ?? 0 )"
              >
                {{ row.qualifying.county.types.general?.qualifyDiff }}
              </td>
              <td
                class="whitespace-nowrap !border-l-2 !border-gray-400 px-2 py-2 text-right text-sm text-gray-900"
                :class="rankClass( row.qualifying.regional.rank )"
              >
                <span class="inline-flex items-baseline">
                  {{ row.qualifying.regional.rank }}
                  <a
                    v-if="row.qualifying.regional.url"
                    target="_blank"
                    rel="noreferrer,nofollow"
                    :href="row.qualifying.regional.url.toString()"
                  >
                    <LinkIcon class="size-3 text-gray-900" />
                  </a>
                </span>
              </td>
              <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                <span class="tooltip">{{ row.qualifying.regional.best ? secondsToTime( row.qualifying.regional.best ) : '' }}<span class="tooltip-text">{{ row.qualifying.regional.best_date }}</span></span>
              </td>
              <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                {{ row.qualifying.regional.difference ? secondsToTime( row.qualifying.regional.difference ) : '' }}
              </td>
              <td
                class="whitespace-nowrap !border-l-1.5 !border-gray-400 px-2 py-2 text-right text-sm text-gray-500"
                :class="[{'qualified': row.qualified.regional.has('summer')},`qualify-type-${row.qualifying.regional.types.summer?.qualifyType}`]"
              >
                {{ row.qualifying.regional.types.summer?.qualifyTime }}
              </td>
              <td
                class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500"
                :class="proxClass( row.qualifying.regional.types.summer?.qualifyProx ?? 0 )"
              >
                {{ row.qualifying.regional.types.summer?.qualifyDiff }}
              </td>
              <td
                class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500"
                :class="[{'qualified': row.qualified.regional.has('winter')},`qualify-type-${row.qualifying.regional.types.winter?.qualifyType}`]"
              >
                {{ row.qualifying.regional.types.winter?.qualifyTime }}
              </td>
              <td
                class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500"
                :class="proxClass( row.qualifying.regional.types.winter?.qualifyProx ?? 0 )"
              >
                {{ row.qualifying.regional.types.winter?.qualifyDiff }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </StandardPage>
</template>

<style scoped>
.sortable {
  cursor: pointer;
}

.pi-sort, .pi-sort-up, .pi-sort-down {
  margin-left: 0.25rem;
}

.qualified {
  background-color: #22c55e30;
}

.qualify-type-eligible {
  font-style: italic;
}

.qualified-county {
  background-color: #22c55e30;
}

.qualified-summer {
  background-color: #f9741642;
}

.qualified-winter {
  background-color: #ef444459;
}

.qualify-prox-5 {
  background-color: #f9741642;
}

.qualify-prox-10 {
  background-color: #ef444459;
}

.age-0, .age-1, .age-2 {
  opacity: 1.0
}

.age-3, .age-4 {
  opacity: 0.85
}

.age-5, .age-6 {
  opacity: 0.7
}

.age-7, .age-8 {
  opacity: 0.6
}

.age-9, .age-10, .age-11 {
  opacity: 0.5
}

.age-12 {
  opacity: 0.4
}

.rank-10 {
  background-color: #0058fc63;
}

.rank-20 {
  background-color: #3cadfd80;
}

.rank-50 {
  background-color: #9eccf880;
}

.time-pb {
  color: #b80381;
}
</style>
