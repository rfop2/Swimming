<script setup lang="ts">
  import type { InternalApi } from "nitropack"

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
          console.log( matches )
          if ( !matches ) {
            throw new Error( `Can't match on '${record.label}'` )
          }
          const groups = matches?.groups ?? {}
          const area = groups.area ? ( groups.area === "glos" ? "county" : "regional" ) : "national"
          const key = `${groups.distance}_${groups.stroke}_${groups.course}`
          const { position, rank, time, best, difference } = record
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
              mergedRecord.county = { position, rank, time, best, difference }
              break
            }
            case "regional" : {
              mergedRecord.regional = { position, rank, time, best, difference }
              break
            }
            case "national" : {
              mergedRecord.national = { position, rank, time, best, difference }
              break
            }
          }
          recordsMap.set( key, mergedRecord )
          return recordsMap
        }, new Map<string,RecordType>() )
        console.log( recordsMap )
        return Array.from( recordsMap.values() )
      },
    } )
  console.log( records )
</script>

<template>
  <div class="container lg mx-auto">
    <h1>Welcome to the homepage</h1>
    <p>
      This is an auto-imported component
      <table class="table-auto border-collapse border-2 border-slate-300">
        <caption class="caption-bottom">
          Performance versus leading times
        </caption>
        <thead>
          <tr>
            <th rowSpan="2" class="align-bottom px-2 border border-slate-300">Distance</th>
            <th rowSpan="2" class="align-bottom px-2 border border-slate-300">Stroke</th>
            <th rowSpan="2" class="align-bottom px-2 border border-slate-300">Course</th>
            <th colSpan="4" class="px-2 border border-l-2 border-slate-300">County</th>
            <th colSpan="4" class="px-2 border border-l-2 border-slate-300">Regional</th>
            <th colSpan="4" class="px-2 border border-l-2 border-slate-300">National</th>
          </tr>
          <tr>
            <th class="text-right px-2 border border-l-2 border-slate-300">Rank</th>
            <th class="text-right px-2 border border-slate-300">Best</th>
            <th class="text-right px-2 border border-slate-300">Time</th>
            <th class="text-right px-2 border border-slate-300">Diff.</th>
            <th class="text-right px-2 border border-l-2 border-slate-300">Rank</th>
            <th class="text-right px-2 border border-slate-300">Best</th>
            <th class="text-right px-2 border border-slate-300">Time</th>
            <th class="text-right px-2 border border-slate-300">Diff.</th>
            <th class="text-right px-2 border border-l-2 border-slate-300">Rank</th>
            <th class="text-right px-2 border border-slate-300">Best</th>
            <th class="text-right px-2 border border-slate-300">Time</th>
            <th class="text-right px-2 border border-slate-300">Diff.</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in records"
            :key="row.key"
          >
            <td class="px-2 border border-slate-300">{{ row.distance }}</td>
            <td class="px-2 border border-slate-300">{{ row.stroke }}</td>
            <td class="px-2 border border-slate-300">{{ row.course }}</td>
            <td class="text-right px-2 border border-l-2 border-slate-300">{{ row.county.rank }}</td>
            <td class="text-right px-2 border border-slate-300">{{ row.county.best?.toFixed(2) }}</td>
            <td class="text-right px-2 border border-slate-300">{{ row.county.time?.toFixed(2) }}</td>
            <td class="text-right px-2 border border-slate-300">{{ row.county.difference?.toFixed(2) }}</td>
            <td class="text-right px-2 border border-l-2 border-slate-300">{{ row.regional.rank }}</td>
            <td class="text-right px-2 border border-slate-300">{{ row.regional.best?.toFixed(2) }}</td>
            <td class="text-right px-2 border border-slate-300">{{ row.regional.time?.toFixed(2) }}</td>
            <td class="text-right px-2 border border-slate-300">{{ row.regional.difference?.toFixed(2) }}</td>
            <td class="text-right px-2 border border-l-2 border-slate-300">{{ row.national.rank }}</td>
            <td class="text-right px-2 border border-slate-300">{{ row.national.best?.toFixed(2) }}</td>
            <td class="text-right px-2 border border-slate-300">{{ row.national.time?.toFixed(2) }}</td>
            <td class="text-right px-2 border border-slate-300">{{ row.national.difference?.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </p>
  </div>
</template>
