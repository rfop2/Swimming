<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { ArrowUturnLeftIcon, LinkIcon, CheckIcon, ChevronUpDownIcon, ChartBarIcon } from "@heroicons/vue/24/outline"
  import { COUNTIES, type Individual, NATIONALITIES, REGIONS, STROKE_DISTANCE, type Swimmer, convertTime, countyRankParams, createUrl, getSwimmerAge, globalRankParams, nationalRankParams, rankBaseUrl, regionalRankParams, secondsToTime, strokeSort } from "lib"
  import { differenceInCalendarMonths, getYear, addMonths } from "date-fns"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  const swimmer = useState<Swimmer>( "swimmer" )

  const qualifyingYear = ref( getYear( addMonths( new Date(), 1 ) ) )
  const getQualifyingAge = ( year: number ) => {
    const age = getSwimmerAge( swimmer.value )
    const yearAge = age + ( year - getYear( new Date() ) )
    return yearAge > 18 ? "Open" : String( yearAge )
  }
  const qualifyingAge = computed( () => getQualifyingAge( qualifyingYear.value ) )

  // type QualifyingApiResponse = InternalApi["/api/qualifying"]["get"]
  const { data: qualifyingInfo } = await useFetch(
    "/api/qualifying",
  )

  const qualifyingYears = computed( () => Array.from( ( qualifyingInfo.value ?? [] ).reduce(
    ( years, row ) => {
      if ( !years.has( row.year ) ) {
        years.add( row.year )
      }
      return years
    },
    new Set<number>()
  ) )
  )

  const qualifyingYearInfo = computed( () => (
    qualifyingInfo.value ?? [] )
    .filter( row => ( row.year === qualifyingYear.value && row.age === qualifyingAge.value ) )
  )

  type PerformanceApiResponse = InternalApi["/api/relative/:id"]["get"]
  interface AreaDetail extends Partial<PerformanceApiResponse[number]> {
    url: URL
    qualifyTime?: string
    qualified?: boolean
  }

  interface QualifyingType {
    county: Partial<AreaDetail>
    regional: Partial<AreaDetail>
    national: Partial<AreaDetail>
  }

  const performanceUrl = computed( ()=> ( `/api/relative/${swimmer.value.id}` ) )
  const { data: performanceRecords } = await useFetch<PerformanceApiResponse>(
    performanceUrl,
    {
      watch: [ swimmer ],
    }
  )

  type PersonalApiResponse = InternalApi["/api/personal/:id"]["get"]

  const personalUrl = computed( ()=> ( `/api/personal/${swimmer.value.id}` ) )
  const { data: personalRecords } = await useFetch<PersonalApiResponse>(
    personalUrl,
    {
      watch: [ swimmer ],
    }
  )

  interface PersonalQualifyingType extends Individual {
    key: string
    age: number
    distanceMetres: number
    qualifiedFor: number
    qualifying: QualifyingType
  }

  const generateRankingUrl = ( swimmer: Swimmer, course: string, stroke: string, distance: string, scope: string, page: number ) => {
    const stroke_distance = STROKE_DISTANCE[`${stroke}__${distance}`.toLocaleUpperCase() as keyof typeof STROKE_DISTANCE]
    const pool = course.substring( 0, 1 ).toLocaleUpperCase()
    switch ( scope ) {
      case "national" : {
        return createUrl( rankBaseUrl, {
          ...{ Stroke: stroke_distance, Pool: pool },
          ...globalRankParams( swimmer, page ),
          ...nationalRankParams,
        } )
      }
      case "regional" : {
        return createUrl( rankBaseUrl, {
          ...{ Stroke: stroke_distance, Pool: pool },
          ...globalRankParams( swimmer, page ),
          ...{ ...regionalRankParams, ...{ TargetRegion: swimmer.region } }
        } )
      }
      case "county" : {
        return createUrl( rankBaseUrl, {
          ...{ Stroke: stroke_distance, Pool: pool },
          ...globalRankParams( swimmer, page ),
          ...{ ...countyRankParams, ...{ TargetCounty: swimmer.county } }
        } )
      }
    }
    throw new Error( `Can't generate ranking url from scope ${scope}` )
  }

  const records = computed( () => {
    try {
      // console.log( "PF", personalRecords.value, performanceRecords.value, qualifyingYearInfo.value )
      if ( !swimmer.value )
        return []

      const performanceRecordsMap = new Map<string,AreaDetail>( ( performanceRecords.value ?? [] ).map( record => {
        const { course, stroke, distance, scope, position, rank, best, best_date, difference } = record
        const key = `${distance}_${stroke}_${course}_${scope}`
        const page = Math.floor( rank / 100 ) + 1
        const url = generateRankingUrl( swimmer.value, course, stroke, distance, scope, page )
        return [ key, {
          url,
          position,
          rank,
          best,
          best_date,
          difference
        } ]
      } ) )
      // console.log( "PerfMap", performanceRecordsMap )

      const qualifyingRecords = ( personalRecords.value ?? [] ).map( record => {
        const { course, stroke, distance, date, time } = record
        const key = `${distance}_${stroke}_${course}`
        const age = differenceInCalendarMonths( new Date(), new Date( date ) )
        const qualifyingRecord: PersonalQualifyingType = {
          key,
          ...record,
          age,
          distanceMetres: Number( distance.replace( /m$/, "" ) ),
          qualifiedFor: 0,
          qualifying: {
            county: {},
            regional: {},
            national: {},
          }
        }
        for ( const scope of Object.keys( qualifyingRecord.qualifying ) ) {
          const performanceRecord = performanceRecordsMap.get( `${key}_${scope}` )
          if ( performanceRecord ) {
            qualifyingRecord.qualifying[scope as keyof QualifyingType] = performanceRecord
          }
          const qualifyingEntry = ( qualifyingYearInfo?.value || [] ).find( entry => (
            entry.stroke === stroke && entry.distance === distance && entry.scope === scope
          ) )
          if ( qualifyingEntry ) {
            const qualifyRaw = qualifyingEntry ? convertTime( qualifyingEntry.course, course, stroke, distance, qualifyingEntry.time ) : undefined
            const qualifyTime = qualifyRaw ? secondsToTime( qualifyRaw ) : undefined
            const qualified = time <= ( qualifyRaw ?? 0 )
            qualifyingRecord.qualifying[scope as keyof QualifyingType].qualifyTime = qualifyTime
            qualifyingRecord.qualifying[scope as keyof QualifyingType].qualified = qualified
            switch ( scope ) {
              case "county" : {
                qualifyingRecord.qualifiedFor = qualifyingRecord.qualifiedFor < 1 && qualified ? 1 : qualifyingRecord.qualifiedFor
                break
              }
              case "regional" : {
                qualifyingRecord.qualifiedFor = qualifyingRecord.qualifiedFor < 2 && qualified ? 2 : qualifyingRecord.qualifiedFor
                break
              }
              default : {
                qualifyingRecord.qualifiedFor = qualifyingRecord.qualifiedFor < 3 && qualified ? 3 : qualifyingRecord.qualifiedFor
                break
              }
            }
          }
        }
        return qualifyingRecord
      } )
      // console.log( "QR", qualifyingRecords )

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

  const flattenedRecords = computed( () => ( records.value || [] ).map( record => ( {
    ...record,
    ...{
      county_rank: record.qualifying.county.rank,
      county_best: record.qualifying.county.best,
      county_time: record.qualifying.county.time,
      county_diff: record.qualifying.county.difference,
      county_qualify: record.qualifying.county.qualifyTime,
      regional_rank: record.qualifying.regional.rank,
      regional_best: record.qualifying.regional.best,
      regional_time: record.qualifying.regional.time,
      regional_diff: record.qualifying.regional.difference,
      regional_qualify: record.qualifying.regional.qualifyTime,
      national_rank: record.qualifying.national.rank,
      national_best: record.qualifying.national.best,
      national_time: record.qualifying.national.time,
      national_diff: record.qualifying.national.difference,
      national_qualify: record.qualifying.national.qualifyTime,
    }
  } ) ) )

  type RecordKey = typeof flattenedRecords["value"][number]

  const { updateSort, getSortIcon, sortRecords, resetSort } = useMultiSort<RecordKey>()

  const sortedRecords = computed( () => sortRecords( flattenedRecords.value ) )
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
</script>

<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">
          Performance
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          Performance in events relative to the event leader if appearing in top 100 rankings (200 for national) in the last 12 months.<br>
        </p>
      </div>
      <div class="mt-4 sm:ml-3 sm:mt-0 sm:flex-none">
        <Listbox
          v-model="qualifyingYear"
          as="div"
        >
          <div class="relative">
            <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
              <span class="block truncate">{{ qualifyingYear + " / " + qualifyingAge }}</span>
              <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  class="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </ListboxButton>
            <transition
              leave-active-class="transition ease-in duration-100"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                <ListboxOption
                  v-for="year in qualifyingYears"
                  :key="year"
                  v-slot="{ active, selected }"
                  as="template"
                  :value="year"
                >
                  <li :class="[active ? 'bg-indigo-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                    <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ year + " / " + getQualifyingAge( year ) }}</span>
                    <span
                      v-if="selected"
                      :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"
                    >
                      <CheckIcon
                        class="h-5 w-5"
                        aria-hidden="true"
                      />
                    </span>
                  </li>
                </ListboxOption>
              </ListboxOptions>
            </transition>
          </div>
        </Listbox>
      </div>
      <div class="mt-4 sm:ml-3 sm:mt-0 sm:flex-none">
        <button
          type="button"
          class="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2 py-1 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          @click="resetSort"
        >
          <span class="py-1">Reset sort</span>
          <ArrowUturnLeftIcon
            class="-mr-0.5 h-5 w-5"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
    <div class="mt-2 bg-white shadow sm:rounded-lg">
      <p class="p-4 text-sm text-gray-700">
        Key &ndash; Best times recorded qualify for <span class="px-2 mr-1 qualifiedArea1" /> county, <span class="px-2 mr-1 qualifiedArea2" /> region, <span class="px-2 mr-1 qualifiedArea3" /> country.
        Event ranking is in the <span class="px-2 mr-1 rank-10" /> top 10, <span class="px-2 mr-1 rank-20" /> top 20, <span class="px-2 mr-1 rank-50" /> top 50.
      </p>
    </div>
    <div class="mt-4 flow-root">
      <div class="overflow-x-auto">
        <div class="inline-block min-w-full py-2 align-middle">
          <table class="min-w-full divide-y divide-gray-300">
            <thead>
              <tr class="divide-x divide-gray-200">
                <th
                  scope="col"
                  rowSpan="2"
                  class="sortable whitespace-nowrap align-bottom pl-2 pr-1 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pl-0"
                  @click="updateSort('distanceMetres')"
                >
                  <span>Dist.</span><i :class="getSortIcon('distanceMetres')" />
                </th>
                <th
                  scope="col"
                  rowSpan="2"
                  class="sortable whitespace-nowrap align-bottom px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                  @click="updateSort('stroke')"
                >
                  <span>Stroke</span><i :class="getSortIcon('stroke')" />
                </th>
                <th
                  scope="col"
                  rowSpan="2"
                  class="sortable whitespace-nowrap align-bottom px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                  @click="updateSort('course')"
                >
                  <span>Course</span><i :class="getSortIcon('course')" />
                </th>
                <th
                  scope="col"
                  rowSpan="2"
                  class="whitespace-nowrap align-bottom px-1 py-4 text-sm font-semibold text-gray-900"
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
                  class="sortable whitespace-nowrap align-bottom px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('time')"
                >
                  <span>Time</span><i :class="getSortIcon('time')" />
                </th>
                <th
                  scope="col"
                  rowSpan="2"
                  class="sortable whitespace-nowrap align-bottom px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('date')"
                >
                  <span>Date</span><i :class="getSortIcon('date')" />
                </th>
                <th
                  scope="col"
                  colSpan="4"
                  class="!border-l-2 !border-gray-400 px-1 py-3.5 text-center text-sm font-semibold text-gray-900"
                >
                  County ({{ COUNTIES[swimmer.county] }})
                </th>
                <th
                  scope="col"
                  colSpan="4"
                  class="!border-l-2 !border-gray-400 px-1 py-3.5 text-center text-sm font-semibold text-gray-900"
                >
                  Regional ({{ REGIONS[swimmer.region] }})
                </th>
                <th
                  scope="col"
                  colSpan="4"
                  class="!border-l-2 !border-gray-400 px-1 py-3.5 text-center text-sm font-semibold text-gray-900 sm:pr-0"
                >
                  National ({{ NATIONALITIES[swimmer.nationality] }})
                </th>
              </tr>
              <tr class="divide-x divide-gray-200">
                <th
                  scope="col"
                  class="sortable whitespace-nowrap !border-l-2 !border-gray-400 px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('county_rank')"
                >
                  <span>Rank</span><i :class="getSortIcon('county_rank')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('county_best')"
                >
                  <span>Lead</span><i :class="getSortIcon('county_best')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('county_diff')"
                >
                  <span>Diff</span><i :class="getSortIcon('county_diff')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('county_qualify')"
                >
                  <span>Qual.</span><i :class="getSortIcon('county_qualify')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap !border-l-2 !border-gray-400 px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('regional_rank')"
                >
                  <span>Rank</span><i :class="getSortIcon('regional_rank')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('regional_best')"
                >
                  <span>Lead</span><i :class="getSortIcon('regional_best')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('regional_diff')"
                >
                  <span>Diff</span><i :class="getSortIcon('regional_diff')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('regional_qualify')"
                >
                  <span>Qual.</span><i :class="getSortIcon('regional_qualify')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap !border-l-2 !border-gray-400 px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('national_rank')"
                >
                  <span>Rank</span><i :class="getSortIcon('national_rank')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('national_best')"
                >
                  <span>Lead</span><i :class="getSortIcon('national_best')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('national_diff')"
                >
                  <span>Diff</span><i :class="getSortIcon('national_diff')" />
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('national_qualify')"
                >
                  <span>Qual.</span><i :class="getSortIcon('national_qualify')" />
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
                  :class="`qualifiedArea${row.qualifiedFor}`"
                >
                  {{ row.time ? secondsToTime( row.time ) : '' }}
                </td>
                <td :class="`whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900 opacity-30 age-${row.age}`">
                  {{ row.date }}
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
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  {{ row.qualifying.county.qualifyTime }}
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
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  {{ row.qualifying.regional.qualifyTime }}
                </td>
                <td
                  class="whitespace-nowrap !border-l-2 !border-gray-400 px-2 py-2 text-right text-sm text-gray-900"
                  :class="rankClass( row.qualifying.national.rank )"
                >
                  <span class="inline-flex items-baseline">
                    {{ row.qualifying.national.rank }}
                    <a
                      v-if="row.qualifying.national.url"
                      target="_blank"
                      rel="noreferrer,nofollow"
                      :href="row.qualifying.national.url.toString()"
                    >
                      <LinkIcon class="size-3 text-gray-900" />
                    </a>
                  </span>
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  <span class="tooltip">{{ row.qualifying.national.best ? secondsToTime( row.qualifying.national.best ) : '' }}<span class="tooltip-text">{{ row.qualifying.national.best_date }}</span></span>
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  {{ row.qualifying.national.difference ? secondsToTime( row.qualifying.national.difference ) : '' }}
                </td>
                <td class="whitespace-nowrap py-2 pl-2 pr-1 text-right text-sm text-gray-500 sm:pr-0">
                  {{ row.qualifying.national.qualifyTime }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.sortable {
  cursor: pointer;
}

.pi-sort, .pi-sort-up, .pi-sort-down {
  margin-left: 0.25rem;
}

.qualifiedArea1 {
  background-color: #22c55e30;
}

.qualifiedArea2 {
  background-color: #f9741642;
}

.qualifiedArea3 {
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
</style>
