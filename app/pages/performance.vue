<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { ArrowUturnLeftIcon, LinkIcon, CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
  import { AGE, GENDER, convertTime, extendedPages, secondsToTime, strokeSort } from "lib"
  import { addYears, differenceInCalendarMonths, getYear, subMonths } from "date-fns"

  definePageMeta( {
    layout: "secure",
    // middleware: [ "protected" ]
  } )

  const extPages = extendedPages()
  const pageLookup = new Map( extPages.map( page => ( [ page.label, page.url.toString() ] ) ) )

  // type QualifyingApiResponse = InternalApi["/api/qualifying"]["get"]

  const qualifyingYear = ref( getYear( addYears( subMonths( new Date(), 1 ), 1 ) ) )
  const qualifyingAge = computed( () => String( Number( AGE ) + ( qualifyingYear.value - getYear( new Date() ) ) ) )

  const { data: qualifyingInfo } = await useFetch(
    // `/api/qualifying/${year}/${AGE}`,
    "/api/qualifying"
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
  const qualifyingYearInfo = computed( () => ( qualifyingInfo.value ?? [] ).filter( row => ( row.year === qualifyingYear.value && row.age === qualifyingAge.value ) ) )

  type ApiResponse = InternalApi["/api/relative"]["get"]
  interface AreaDetail extends Partial<ApiResponse[number]> {
    label: string
    qualifyTime?: string
    qualified?: boolean
  }

  interface RecordType {
    key: string
    course: string
    stroke: string
    distance: string
    distanceMetres: number
    time: number
    time_date: string
    age: number
    qualifiedFor: number
    county: Partial<AreaDetail>
    regional: Partial<AreaDetail>
    national: Partial<AreaDetail>
  }

  const { data: performanceRecords } = await useFetch(
    "/api/relative",
  )

  const records = computed( () => {
    try {
      const recordsMap = ( performanceRecords.value ?? [] ).reduce( ( recordsMap, record ) => {
        const { course, stroke, distance, area, position, rank, time, time_date, best, best_date, difference } = record
        const age = differenceInCalendarMonths( new Date(), new Date( time_date ) )
        const key = `${distance}_${stroke}_${course}`
        let mergedRecord = recordsMap.get( key )
        if ( !mergedRecord ) {
          mergedRecord = {
            key,
            course,
            stroke,
            distance,
            distanceMetres: Number( distance.replace( /m$/, "" ) ),
            time,
            time_date,
            age,
            qualifiedFor: 0,
            county: {},
            regional: {},
            national: {},
          }
        }
        const qualifyingEntry = ( qualifyingYearInfo?.value || [] ).find( entry => (
          entry.stroke === stroke && entry.distance === distance && entry.area === area
        ) )
        const qualifyRaw = qualifyingEntry ? convertTime( qualifyingEntry.course, course, stroke, distance, qualifyingEntry.time ) : undefined
        const qualifyTime = qualifyRaw ? secondsToTime( qualifyRaw ) : undefined
        const qualified = time <= ( qualifyRaw ?? 0 )
        const page = Math.floor( rank / 100 ) + 1
        const label = `${distance}_${stroke}_${GENDER}_${course}_${AGE}${area ? `_${area}` : ""}${page > 1 ? `-${page}` : ""}`
        switch ( area ) {
          case "glos" : {
            mergedRecord.qualifiedFor = mergedRecord.qualifiedFor < 1 && qualified ? 1 : mergedRecord.qualifiedFor
            mergedRecord.county = { label, position, rank, best, best_date, difference, qualifyTime, qualified }
            break
          }
          case "sw" : {
            mergedRecord.qualifiedFor = mergedRecord.qualifiedFor < 2 && qualified ? 2 : mergedRecord.qualifiedFor
            mergedRecord.regional = { label, position, rank, best, best_date, difference, qualifyTime, qualified }
            break
          }
          default : {
            mergedRecord.qualifiedFor = mergedRecord.qualifiedFor < 3 && qualified ? 3 : mergedRecord.qualifiedFor
            mergedRecord.national = { label, position, rank, best, best_date, difference, qualifyTime, qualified }
            break
          }
        }
        recordsMap.set( key, mergedRecord )
        return recordsMap
      }, new Map<string,RecordType>() )

      const recordArray = Array.from( recordsMap.values() )
      recordArray.sort( ( a, b ) => {
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
      return recordArray
    } catch ( error ) {
      console.error( error )
    }
    return []
  } )

  const flattenedRecords = computed( () => ( records.value || [] ).map( record => ( {
    ...record,
    ...{
      county_rank: record.county.rank,
      county_best: record.county.best,
      county_time: record.county.time,
      county_diff: record.county.difference,
      county_qualify: record.county.qualifyTime,
      regional_rank: record.regional.rank,
      regional_best: record.regional.best,
      regional_time: record.regional.time,
      regional_diff: record.regional.difference,
      regional_qualify: record.regional.qualifyTime,
      national_rank: record.national.rank,
      national_best: record.national.best,
      national_time: record.national.time,
      national_diff: record.national.difference,
      national_qualify: record.national.qualifyTime,
    }
  } ) ) )

  type RecordKey = typeof flattenedRecords["value"][number]

  const { updateSort, getSortIcon, sortRecords, resetSort } = useMultiSort<RecordKey>()

  const sortedRecords = computed( () => sortRecords( flattenedRecords.value ) )

</script>

<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">
          Performance
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          Performance in events relative to the event leader if appearing in top 100 rankings.
        </p>
      </div>
      <div class="min-w-32">
        <Listbox
          v-model="qualifyingYear"
          as="div"
        >
          <div class="relative">
            <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
              <span class="block truncate">{{ qualifyingYear }}</span>
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
                    <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ year }}</span>

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
                  class="sortable whitespace-nowrap align-bottom px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('time')"
                >
                  <span>Time</span><i :class="getSortIcon('time')" />
                </th>
                <th
                  scope="col"
                  rowSpan="2"
                  class="sortable whitespace-nowrap align-bottom px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('time_date')"
                >
                  <span>Date</span><i :class="getSortIcon('time_date')" />
                </th>
                <th
                  scope="col"
                  colSpan="4"
                  class="px-1 py-3.5 text-center text-sm font-semibold text-gray-900"
                >
                  County
                </th>
                <th
                  scope="col"
                  colSpan="4"
                  class="px-1 py-3.5 text-center text-sm font-semibold text-gray-900"
                >
                  Regional
                </th>
                <th
                  scope="col"
                  colSpan="4"
                  class="px-1 py-3.5 text-center text-sm font-semibold text-gray-900 sm:pr-0"
                >
                  National
                </th>
              </tr>
              <tr class="divide-x divide-gray-200">
                <th
                  scope="col"
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900 border-l-[1px]"
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
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
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
                  class="sortable whitespace-nowrap px-1 py-3.5 text-right text-sm font-semibold text-gray-900"
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
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900">
                  <span :class="`qualifiedArea${row.qualifiedFor}`">{{ row.time ? secondsToTime( row.time ) : '' }}</span>
                </td>
                <td :class="`whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900 opacity-30 age-${row.age}`">
                  {{ row.time_date }}
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900">
                  <span class="inline-flex items-baseline">
                    {{ row.county.rank }}
                    <a
                      v-if="row.county.label"
                      target="_blank"
                      rel="noreferrer,nofollow"
                      :href="pageLookup.get(row.county.label)"
                    >
                      <LinkIcon class="size-3 text-gray-900" />
                    </a>
                  </span>
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  <span class="tooltip">{{ row.county.best ? secondsToTime( row.county.best ) : '' }}<span class="tooltip-text">{{ row.county.best_date }}</span></span>
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  {{ row.county.difference ? secondsToTime( row.county.difference ) : '' }}
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  {{ row.county.qualifyTime }}
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900">
                  <span class="inline-flex items-baseline">
                    {{ row.regional.rank }}
                    <a
                      v-if="row.regional.label"
                      target="_blank"
                      rel="noreferrer,nofollow"
                      :href="pageLookup.get(row.regional.label)"
                    >
                      <LinkIcon class="size-3 text-gray-900" />
                    </a>
                  </span>
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  <span class="tooltip">{{ row.regional.best ? secondsToTime( row.regional.best ) : '' }}<span class="tooltip-text">{{ row.regional.best_date }}</span></span>
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  {{ row.regional.difference ? secondsToTime( row.regional.difference ) : '' }}
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  {{ row.regional.qualifyTime }}
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900">
                  <span class="inline-flex items-baseline">
                    {{ row.national.rank }}
                    <a
                      v-if="row.national.label"
                      target="_blank"
                      rel="noreferrer,nofollow"
                      :href="pageLookup.get(row.national.label)"
                    >
                      <LinkIcon class="size-3 text-gray-900" />
                    </a>
                  </span>
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  <span class="tooltip">{{ row.national.best ? secondsToTime( row.national.best ) : '' }}<span class="tooltip-text">{{ row.national.best_date }}</span></span>
                </td>
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
                  {{ row.national.difference ? secondsToTime( row.national.difference ) : '' }}
                </td>
                <td class="whitespace-nowrap py-2 pl-2 pr-1 text-right text-sm text-gray-500 sm:pr-0">
                  {{ row.national.qualifyTime }}
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
  color: #22c55e;
}

.qualifiedArea2 {
  color: #f97316;
}

.qualifiedArea3 {
  color: #ef4444;
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
</style>
