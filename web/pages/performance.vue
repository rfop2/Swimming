<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { LinkIcon } from "@heroicons/vue/16/solid"
  import { pages } from "~/lib/pages"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
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
        // console.log( recordsMap )
        const recordArray = Array.from( recordsMap.values() )
        recordArray.sort( ( a, b ) => {
          if ( a.course < b.course ) {
            return -1
          } else if ( a.course > b.course ) {
            return 1
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
  // console.log( records )
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">Users</h1>
        <p class="mt-2 text-sm text-gray-700">Performance in events relative to the event leader if appearing in top 100 rankings.</p>
      </div>
    </div>
    <div class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table class="min-w-full divide-y divide-gray-300">
            <thead>
              <tr class="divide-x divide-gray-200">
                <th scope="col" rowSpan="2" class="align-bottom px-4 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pl-0">Distance</th>
                <th scope="col" rowSpan="2" class="align-bottom px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Stroke</th>
                <th scope="col" rowSpan="2" class="align-bottom px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Course</th>
                <th scope="col" colSpan="4" class="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">County</th>
                <th scope="col" colSpan="4" class="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Regional</th>
                <th scope="col" colSpan="4" class="py-3.5 pl-4 pr-4 text-center text-sm font-semibold text-gray-900 sm:pr-0">National</th>
              </tr>
              <tr class="divide-x divide-gray-200">
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900 border-l-[1px]">Rank</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Best</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Time</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Diff.</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Rank</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Best</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Time</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Diff.</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Rank</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Best</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Time</th>
                <th scope="col" class="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Diff.</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="row in records" :key="row.key" class="divide-x divide-gray-200">
                <td class="whitespace-nowrap py-4 pl-4 pr-4 text-right text-sm font-medium text-gray-900 sm:pl-0">{{ row.distance }}</td>
                <td class="whitespace-nowrap p-4 text-sm text-gray-900">{{ row.stroke.replace( /_/g, " " ).replace(/\b\w/g, char => char.toUpperCase()) }}</td>
                <td class="whitespace-nowrap p-4 text-sm text-gray-900">{{ row.course === "lc" ? "Long" : "Short" }}</td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-900">
                  <span class="inline-flex items-baseline">
                    {{ row.county.rank }}
                    <a v-if="row.county.label" target="_blank" rel="noreferrer,nofollow" :href="pageLookup.get(row.county.label)">
                      <LinkIcon class="size-3 text-gray-900"/>
                    </a>
                  </span>
                </td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-500">{{ row.county.best?.toFixed(2) }}</td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-500">{{ row.county.time?.toFixed(2) }}</td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-500">{{ row.county.difference?.toFixed(2) }}</td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-900">
                  <span class="inline-flex items-baseline">
                    {{ row.regional.rank }}
                    <a v-if="row.regional.label" target="_blank" rel="noreferrer,nofollow" :href="pageLookup.get(row.regional.label)">
                      <LinkIcon class="size-3 text-gray-900"/>
                    </a>
                  </span>
                </td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-500">{{ row.regional.best?.toFixed(2) }}</td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-500">{{ row.regional.time?.toFixed(2) }}</td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-500">{{ row.regional.difference?.toFixed(2) }}</td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-900">
                  <span class="inline-flex items-baseline">
                    {{ row.national.rank }}
                    <a v-if="row.national.label" target="_blank" rel="noreferrer,nofollow" :href="pageLookup.get(row.national.label)">
                      <LinkIcon class="size-3 text-gray-900"/>
                    </a>
                  </span>
                </td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-500">{{ row.national.best?.toFixed(2) }}</td>
                <td class="whitespace-nowrap p-4 text-right text-sm text-gray-500">{{ row.national.time?.toFixed(2) }}</td>
                <td class="whitespace-nowrap py-4 pl-4 pr-4 text-right text-sm text-gray-500 sm:pr-0">{{ row.national.difference?.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
