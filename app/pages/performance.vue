<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { ArrowUturnLeftIcon, LinkIcon } from "@heroicons/vue/16/solid"
  import { pages, secondsToTime } from "lib"

  definePageMeta( {
    layout: "secure",
    // middleware: [ "protected" ]
  } )

  const pageLookup = new Map( pages.map( page => ( [ page.label, page.url.toString() ] ) ) )

  const strokeSort: Record<string,number> = {
    freestyle: 0,
    breaststroke: 1,
    butterfly: 2,
    backstroke: 3,
    individual_medley: 4
  }

  type ApiResponse = InternalApi["/api/relative"]["get"]
  interface RecordType {
    key: string
    course: string
    stroke: string
    distance: string
    county: Partial<ApiResponse[number]>
    regional: Partial<ApiResponse[number]>
    national: Partial<ApiResponse[number]>
  }

  const { data: records } = await useFetch(
    "/api/relative",
    {
      transform( data: ApiResponse ) : Array<RecordType> {
        const recordsMap = data.reduce( ( recordsMap, record ) => {
          // 100m_backstroke_female_sc_11_glos
          const matches = record.label.match( /(?<distance>\d+m)_(?<stroke>\w+)_female_(?<course>.c)_11(?:_(?<area>\w+))?/ )
          if ( !matches ) {
            throw new Error( `Can't match on '${record.label}'` )
          }
          const groups = matches?.groups ?? {}
          const area = groups.area ? ( groups.area === "glos" ? "county" : "regional" ) : "national"
          const key = `${groups.distance}_${groups.stroke}_${groups.course}`
          const { label, position, rank, time, best, difference } = record
          let mergedRecord = recordsMap.get( key )
          if ( !mergedRecord ) {
            mergedRecord = {
              key,
              course: matches.groups?.course as string,
              stroke: matches.groups?.stroke as string,
              distance: matches.groups?.distance as string,
              county: {},
              regional: {},
              national: {},
            }
          }
          switch ( area ) {
            case "county" : {
              mergedRecord.county = { label, position, rank, time, best, difference }
              break
            }
            case "regional" : {
              mergedRecord.regional = { label, position, rank, time, best, difference }
              break
            }
            case "national" : {
              mergedRecord.national = { label, position, rank, time, best, difference }
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
          if ( a.distance < b.distance ) {
            return 1
          } else if ( a.distance > b.distance ) {
            return -1
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
      regional_rank: record.regional.rank,
      regional_best: record.regional.best,
      regional_time: record.regional.time,
      regional_diff: record.regional.difference,
      national_rank: record.national.rank,
      national_best: record.national.best,
      national_time: record.national.time,
      national_diff: record.national.difference,
    }
  } ) ) )

  type RecordKey = typeof flattenedRecords["value"][number]

  interface SortMeta {
    field: keyof RecordKey;
    order: number;
  }

  const multiSortMeta = ref<SortMeta[]>( [] )

  const sort = ( field: keyof RecordKey ) => {
    const existingSortMeta = multiSortMeta.value.find( meta => meta.field === field )
    if ( existingSortMeta ) {
      if ( existingSortMeta.order === 1 ) {
        existingSortMeta.order = -1
      } else {
        multiSortMeta.value = multiSortMeta.value.filter( meta => meta.field !== field )
      }
    } else {
      multiSortMeta.value.push( { field, order: 1 } )
    }
  }

  const getSortIcon = ( field: keyof RecordKey ) => {
    const sortMeta = multiSortMeta.value.find( meta => meta.field === field )
    if ( sortMeta ) {
      return sortMeta.order === 1 ? "pi pi-sort-up" : "pi pi-sort-down"
    }
    return "pi pi-sort"
  }

  const sortedRecords = computed( () => {
    if ( multiSortMeta.value.length === 0 ) {
      return records.value
    }
    return [ ...flattenedRecords.value || [] ].sort( ( a, b ) => {
      for ( const meta of multiSortMeta.value ) {
        const field = meta.field as keyof RecordType
        const valueA = a[field]
        const valueB = b[field]
        const result = valueA > valueB ? 1 : valueA < valueB ? -1 : 0
        if ( result !== 0 ) {
          return meta.order * result
        }
      }
      return 0
    } )
  } )

  const resetSort = () => {
    multiSortMeta.value = []
  }
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">Performance</h1>
        <p class="mt-2 text-sm text-gray-700">Performance in events relative to the event leader if appearing in top 100 rankings.</p>
      </div>
      <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
        <button type="button" class="inline-flex items-center gap-x-1.5 rounded bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" @click="resetSort">
          Reset sort
          <ArrowUturnLeftIcon class="-mr-0.5 h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table class="min-w-full divide-y divide-gray-300">
            <thead>
              <tr class="divide-x divide-gray-200">
                <th scope="col" rowSpan="2" class="sortable whitespace-nowrap align-bottom pl-4 pr-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pl-0" @click="sort('distance')"><span>Dist.</span><i :class="getSortIcon('distance')"/></th>
                <th scope="col" rowSpan="2" class="sortable whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900" @click="sort('stroke')"><span>Stroke</span><i :class="getSortIcon('stroke')"/></th>
                <th scope="col" rowSpan="2" class="sortable whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900" @click="sort('course')"><span>Course</span><i :class="getSortIcon('course')"/></th>
                <th scope="col" colSpan="4" class="px-2 py-3.5 text-center text-sm font-semibold text-gray-900">County</th>
                <th scope="col" colSpan="4" class="px-2 py-3.5 text-center text-sm font-semibold text-gray-900">Regional</th>
                <th scope="col" colSpan="4" class="py-3.5 pl-3 pr-4 text-center text-sm font-semibold text-gray-900 sm:pr-0">National</th>
              </tr>
              <tr class="divide-x divide-gray-200">
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900 border-l-[1px]" @click="sort('county_rank')"><span>Rank</span><i :class="getSortIcon('county_rank')"/></th>
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('county_best')"><span>Lead</span><i :class="getSortIcon('county_best')"/></th>
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('county_time')"><span>Time</span><i :class="getSortIcon('county_time')"/></th>
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('county_diff')"><span>Diff</span><i :class="getSortIcon('county_diff')"/></th>
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('regional_rank')"><span>Rank</span><i :class="getSortIcon('regional_rank')"/></th>
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('regional_best')"><span>Lead</span><i :class="getSortIcon('regional_best')"/></th>
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('regional_time')"><span>Time</span><i :class="getSortIcon('regional_time')"/></th>
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('regional_diff')"><span>Diff</span><i :class="getSortIcon('regional_diff')"/></th>
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('national_rank')"><span>Rank</span><i :class="getSortIcon('national_rank')"/></th>
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('national_best')"><span>Lead</span><i :class="getSortIcon('national_best')"/></th>
                <th scope="col" class="sortable whitespace-nowrap px-2 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('national_time')"><span>Time</span><i :class="getSortIcon('national_time')"/></th>
                <th scope="col" class="sortable whitespace-nowrap pl-3 pr-4 py-3.5 text-right text-sm font-semibold text-gray-900" @click="sort('national_diff')"><span>Diff</span><i :class="getSortIcon('national_diff')"/></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="row in sortedRecords" :key="row.key" class="divide-x divide-gray-200">
                <td class="whitespace-nowrap py-2 pl-4 pr-3 text-right text-sm font-medium text-gray-900 sm:pl-0">{{ row.distance }}</td>
                <td class="whitespace-nowrap p-2 text-sm text-gray-900">{{ row.stroke.replace( /_/g, " " ).replace(/\b\w/g, char => char.toUpperCase()) }}</td>
                <td class="whitespace-nowrap p-2 text-sm text-gray-900">{{ row.course === "lc" ? "Long" : "Short" }}</td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-900">
                  <span class="inline-flex items-baseline">
                    {{ row.county.rank }}
                    <a v-if="row.county.label" target="_blank" rel="noreferrer,nofollow" :href="pageLookup.get(row.county.label)">
                      <LinkIcon class="size-3 text-gray-900"/>
                    </a>
                  </span>
                </td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-500">{{ row.county.best ? secondsToTime( row.county.best ) : '' }}</td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-500">{{ row.county.time ? secondsToTime( row.county.time ) : '' }}</td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-500">{{ row.county.difference ? secondsToTime( row.county.difference ) : '' }}</td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-900">
                  <span class="inline-flex items-baseline">
                    {{ row.regional.rank }}
                    <a v-if="row.regional.label" target="_blank" rel="noreferrer,nofollow" :href="pageLookup.get(row.regional.label)">
                      <LinkIcon class="size-3 text-gray-900"/>
                    </a>
                  </span>
                </td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-500">{{ row.regional.best ? secondsToTime( row.regional.best ) : '' }}</td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-500">{{ row.regional.time ? secondsToTime( row.regional.time ) : '' }}</td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-500">{{ row.regional.difference ? secondsToTime( row.regional.difference ) : '' }}</td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-900">
                  <span class="inline-flex items-baseline">
                    {{ row.national.rank }}
                    <a v-if="row.national.label" target="_blank" rel="noreferrer,nofollow" :href="pageLookup.get(row.national.label)">
                      <LinkIcon class="size-3 text-gray-900"/>
                    </a>
                  </span>
                </td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-500">{{ row.national.best ? secondsToTime( row.national.best ) : '' }}</td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-500">{{ row.national.time ? secondsToTime( row.national.time ) : '' }}</td>
                <td class="whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm text-gray-500 sm:pr-0">{{ row.national.difference ? secondsToTime( row.national.difference ) : '' }}</td>
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
</style>
