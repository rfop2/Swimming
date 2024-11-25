<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { ArrowUturnLeftIcon, LinkIcon } from "@heroicons/vue/16/solid"
  import { AGE, GENDER, convertTime, extendedPages, secondsToTime } from "lib"

  definePageMeta( {
    layout: "secure",
    // middleware: [ "protected" ]
  } )

  const extPages = extendedPages()
  const pageLookup = new Map( extPages.map( page => ( [ page.label, page.url.toString() ] ) ) )

  const strokeSort: Record<string,number> = {
    freestyle: 0,
    breaststroke: 1,
    butterfly: 2,
    backstroke: 3,
    individual_medley: 4
  }

  const { data: qualifying } = await useFetch(
    "/api/qualifying",
  )

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
    qualifiedFor: number
    county: Partial<AreaDetail>
    regional: Partial<AreaDetail>
    national: Partial<AreaDetail>
  }

  const { data: records } = await useFetch(
    "/api/relative",
    {
      transform( data: ApiResponse ) : Array<RecordType> {
        const recordsMap = data.reduce( ( recordsMap, record ) => {
          const { course, stroke, distance, area, position, rank, time, time_date, best, best_date, difference } = record
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
              qualifiedFor: 0,
              county: {},
              regional: {},
              national: {},
            }
          }
          const qualifyingEntry = ( qualifying?.value || [] ).find( entry => (
            course && entry.stroke === stroke && entry.distance === distance && entry.area === area
            // entry.course === course && entry.stroke === stroke && entry.distance === distance && entry.area === area
          ) )
          const qualifyRaw = qualifyingEntry ? convertTime( qualifyingEntry.course, course, stroke, distance, qualifyingEntry.time ) : undefined
          const qualifyTime = qualifyRaw ? secondsToTime( qualifyRaw ) : undefined
          const qualified = time <= ( qualifyRaw ?? 0 )
          const label = `${distance}_${stroke}_${GENDER}_${course}_${AGE}${area ? `_${area}` : ""}`
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
      },
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
      <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
        <button
          type="button"
          class="inline-flex items-center gap-x-1.5 rounded bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          @click="resetSort"
        >
          Reset sort
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
                <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900">
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
</style>
