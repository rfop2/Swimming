<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { LinkIcon, ChartBarIcon } from "@heroicons/vue/24/outline"
  import { COUNTIES, REGIONS, type Swimmer, type ScopeType, secondsToTime, strokeSort, generateRankingUrl, formatStroke } from "lib"
  import { differenceInCalendarMonths, format, parseISO } from "date-fns"

  type RelativeApiResponse = InternalApi["/api/relative/:id"]["get"]
  type PersonalApiResponse = InternalApi["/api/personal/:id"]["get"]

  const props = withDefaults( defineProps<{
    swimmer: Swimmer
    relativeRecords: RelativeApiResponse
    personalRecords: PersonalApiResponse
    showLinks?: boolean
  }>(), {
    showLinks: true,
  } )

  interface RankingDetail {
    url?: URL
    rank?: number
    best?: number
    bestDate?: string
    difference?: number
  }

  interface PersonalBestRow {
    key: string
    course: string
    stroke: string
    distance: string
    distanceMetres: number
    time: number
    date: string
    meet?: string
    venue?: string
    age: number
    rankedTime?: number
    rankedDate?: string
    rankings: Record<ScopeType, RankingDetail>
  }

  const scopes: ScopeType[] = [ "county", "regional" ]

  const records = computed( () => {
    const rankingsMap = new Map( ( props.relativeRecords ?? [] )
      .filter( record => scopes.includes( record.scope as ScopeType ) )
      .map( record => [ `${record.distance}_${record.stroke}_${record.course}_${record.scope}`, record ] ) )

    const rows = ( props.personalRecords ?? [] ).map( record => {
      const { course, stroke, distance, date } = record
      const key = `${distance}_${stroke}_${course}`
      const row: PersonalBestRow = {
        key,
        course,
        stroke,
        distance,
        distanceMetres: Number( distance.replace( /m$/, "" ) ),
        time: Number( record.time ),
        date: String( date ),
        meet: record.meet ?? undefined,
        venue: record.venue ?? undefined,
        age: differenceInCalendarMonths( new Date(), new Date( String( date ) ) ),
        rankings: { county: {}, regional: {} },
      }
      for ( const scope of scopes ) {
        const ranking = rankingsMap.get( `${key}_${scope}` )
        if ( !ranking ) continue
        row.rankings[scope] = {
          url: generateRankingUrl( props.swimmer, course, stroke, distance, scope, Math.floor( ranking.rank / 100 ) + 1 ),
          rank: ranking.rank,
          best: ranking.best ? Number( ranking.best ) : undefined,
          bestDate: ranking.best_date ?? undefined,
          difference: ranking.difference ? Number( ranking.difference ) : undefined,
        }
        // County and regional rankings cover the same period so normally agree,
        // but take the faster in case one was refreshed more recently.
        if ( ranking.time && ( !row.rankedTime || Number( ranking.time ) < row.rankedTime ) ) {
          row.rankedTime = Number( ranking.time )
          row.rankedDate = ranking.time_date ?? undefined
        }
      }
      return row
    } )

    rows.sort( ( a, b ) => {
      if ( a.course !== b.course ) return a.course < b.course ? 1 : -1
      const strokeDiff = strokeSort[a.stroke as keyof typeof strokeSort] - strokeSort[b.stroke as keyof typeof strokeSort]
      if ( strokeDiff ) return strokeDiff
      return a.distanceMetres - b.distanceMetres
    } )
    return rows
  } )

  const { updateSort, getSortIcon, sortRecords } = useMultiSort<PersonalBestRow>()

  const sortedRecords = computed( () => sortRecords( records.value ) )

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

  const formatDate = ( date?: string ) => date ? format( parseISO( date ), "yyyy-MM-dd" ) : ""
</script>

<template>
  <div
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
            colSpan="3"
            class="!border-l-2 !border-gray-400 px-1 py-1.5 text-center text-sm font-semibold text-gray-900"
          >
            Personal Best
          </th>
          <th
            scope="col"
            colSpan="2"
            class="!border-l-2 !border-gray-400 px-1 py-1.5 text-center text-sm font-semibold text-gray-900"
          >
            Ranked (12 mths)
          </th>
          <th
            scope="col"
            colSpan="3"
            class="!border-l-2 !border-gray-400 px-1 py-1.5 text-center text-sm font-semibold text-gray-900"
          >
            County ({{ COUNTIES[swimmer.county] }})
          </th>
          <th
            scope="col"
            colSpan="3"
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
            Time
          </th>
          <th
            scope="col"
            class="sortable whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
            @click="updateSort('date')"
          >
            <span>Date</span><i :class="getSortIcon('date')" />
          </th>
          <th
            scope="col"
            class="whitespace-nowrap px-1 py-1.5 align-bottom text-left text-sm font-semibold text-gray-900"
          >
            Meet
          </th>
          <th
            scope="col"
            class="whitespace-nowrap !border-l-2 !border-gray-400 px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
          >
            Time
          </th>
          <th
            scope="col"
            class="whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
          >
            Date
          </th>
          <template
            v-for="scope in scopes"
            :key="scope"
          >
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
          </template>
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
            {{ formatStroke( row.stroke ) }}
          </td>
          <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-900">
            {{ row.course === "lc" ? "Long" : "Short" }}
          </td>
          <td class="whitespace-nowrap px-2 py-2 text-sm text-gray-900">
            <nuxt-link
              v-if="showLinks"
              :href="`/results/${row.course}/${row.stroke}/${row.distance}`"
            >
              <LinkIcon class="size-3 text-gray-900" />
            </nuxt-link>
          </td>
          <td class="whitespace-nowrap !border-l-2 !border-gray-400 px-2 py-2 text-right text-sm time-pb">
            {{ secondsToTime( row.time ) }}
          </td>
          <td :class="`whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900 opacity-30 age-${row.age}`">
            {{ formatDate( row.date ) }}
          </td>
          <td
            class="max-w-48 truncate px-2 py-2 text-sm text-gray-500"
            :title="[ row.meet, row.venue ].filter( Boolean ).join( ', ' )"
          >
            {{ row.meet }}
          </td>
          <td
            class="whitespace-nowrap !border-l-2 !border-gray-400 px-2 py-2 text-right text-sm text-gray-900"
            :class="{ 'time-pb': row.rankedTime === row.time }"
          >
            {{ row.rankedTime ? secondsToTime( row.rankedTime ) : '' }}
          </td>
          <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
            {{ formatDate( row.rankedDate ) }}
          </td>
          <template
            v-for="scope in scopes"
            :key="scope"
          >
            <td
              class="whitespace-nowrap !border-l-2 !border-gray-400 px-2 py-2 text-right text-sm text-gray-900"
              :class="rankClass( row.rankings[scope].rank )"
            >
              <span class="inline-flex items-baseline">
                {{ row.rankings[scope].rank }}
                <a
                  v-if="showLinks && row.rankings[scope].url"
                  target="_blank"
                  rel="noreferrer,nofollow"
                  :href="row.rankings[scope].url!.toString()"
                >
                  <LinkIcon class="size-3 text-gray-900" />
                </a>
              </span>
            </td>
            <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
              <span class="tooltip">{{ row.rankings[scope].best ? secondsToTime( row.rankings[scope].best! ) : '' }}<span class="tooltip-text">{{ row.rankings[scope].bestDate }}</span></span>
            </td>
            <td class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500">
              {{ row.rankings[scope].difference ? secondsToTime( row.rankings[scope].difference! ) : '' }}
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.sortable {
  cursor: pointer;
}

.pi-sort, .pi-sort-up, .pi-sort-down {
  margin-left: 0.25rem;
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
