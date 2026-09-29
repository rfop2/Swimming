<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { LinkIcon } from "@heroicons/vue/24/outline"
  import { COUNTIES, REGIONS, type Swimmer, secondsToTime, strokeSort, formatStroke } from "lib"
  import { format, parseISO } from "date-fns"

  type QualificationsApiResponse = InternalApi["/api/qualifying/status/:id"]["get"]
  type PeriodQualifications = QualificationsApiResponse["periods"][number]
  type Entry = PeriodQualifications["entries"][number]

  const props = withDefaults( defineProps<{
    swimmer: Swimmer
    qualifications: QualificationsApiResponse
    showLinks?: boolean
  }>(), {
    showLinks: true,
  } )

  const scopeOrder = { county: 0, regional: 1 } as const
  const typeOrder = { general: 0, summer: 1, winter: 2 } as const

  const periods = computed( () => [ ...( props.qualifications?.periods ?? [] ) ]
    .sort( ( a, b ) => ( scopeOrder[a.period.scope] - scopeOrder[b.period.scope] ) || ( typeOrder[a.period.type] - typeOrder[b.period.type] ) ) )

  interface QualificationRow {
    key: string
    course: string
    stroke: string
    distance: string
    distanceMetres: number
    entries: ( Entry | undefined )[]
  }

  const records = computed( () => {
    const rows = new Map<string, QualificationRow>()
    periods.value.forEach( ( { entries }, index ) => {
      for ( const entry of entries ) {
        const key = `${entry.distance}_${entry.stroke}_${entry.course}`
        let row = rows.get( key )
        if ( !row ) {
          row = {
            key,
            course: entry.course,
            stroke: entry.stroke,
            distance: entry.distance,
            distanceMetres: Number( entry.distance.replace( /m$/, "" ) ),
            entries: periods.value.map( () => undefined ),
          }
          rows.set( key, row )
        }
        row.entries[index] = entry
      }
    } )
    return [ ...rows.values() ].sort( ( a, b ) => {
      if ( a.course !== b.course ) return a.course < b.course ? 1 : -1
      const strokeDiff = strokeSort[a.stroke as keyof typeof strokeSort] - strokeSort[b.stroke as keyof typeof strokeSort]
      if ( strokeDiff ) return strokeDiff
      return a.distanceMetres - b.distanceMetres
    } )
  } )

  const periodTitle = ( period: PeriodQualifications["period"] ) => {
    const area = period.scope === "county" ? COUNTIES[period.area] ?? period.area : REGIONS[period.area] ?? period.area
    const type = period.type === "general" ? "" : ` ${period.type.charAt( 0 ).toUpperCase()}${period.type.slice( 1 )}`
    return `${period.scope === "county" ? "County" : "Regional"}${type} ${period.year} (${area})`
  }

  const formatDate = ( date?: string | null ) => date ? format( parseISO( date ), "d MMM yyyy" ) : ""

  const periodWindow = ( period: PeriodQualifications["period"] ) => {
    const window = `${formatDate( period.qualifyingStart )} – ${period.qualifyingEnd ? formatDate( period.qualifyingEnd ) : "open"}`
    return period.status === "closed" ? `${window} (closed)` : window
  }

  const proxClass = ( entry?: Entry ) => {
    if ( !entry || entry.qualified ) return undefined
    const prox = 100 * entry.difference / entry.qualifyingTime
    if ( prox <= 5 ) return "qualify-prox-5"
    if ( prox <= 10 ) return "qualify-prox-10"
    return undefined
  }

  const formatDifference = ( difference: number ) => `${difference > 0 ? "+" : "−"}${secondsToTime( Math.abs( difference ) )}`
</script>

<template>
  <div
    class="inline-block min-w-full py-2 align-middle"
  >
    <p
      v-if="!periods.length"
      class="text-sm text-gray-500"
    >
      There are no open qualifying periods with standards for {{ swimmer.firstName }}'s age group in {{ COUNTIES[swimmer.county] }} or {{ REGIONS[swimmer.region] }}.
    </p>
    <table
      v-else
      class="min-w-full divide-y divide-gray-300"
    >
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
          />
          <th
            v-for="{ period } in periods"
            :key="`${period.scope}_${period.type}`"
            scope="col"
            colSpan="4"
            class="!border-l-2 !border-gray-400 px-1 py-1.5 text-center text-sm font-semibold text-gray-900"
            :class="{ 'period-closed': period.status === 'closed' }"
          >
            {{ periodTitle( period ) }}
            <div class="text-xs font-normal text-gray-500">
              {{ periodWindow( period ) }}
            </div>
            <div
              v-if="period.status === 'closed' && period.lastRaceDate"
              class="text-xs font-normal text-gray-500"
            >
              Last race {{ formatDate( period.lastRaceDate ) }}
            </div>
          </th>
        </tr>
        <tr class="divide-x divide-gray-200">
          <template
            v-for="{ period } in periods"
            :key="`${period.scope}_${period.type}`"
          >
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
            <th
              scope="col"
              class="whitespace-nowrap px-1 py-1.5 align-bottom text-right text-sm font-semibold text-gray-900"
            >
              Qual.
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
          v-for="row in records"
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
          <template
            v-for="( entry, index ) in row.entries"
            :key="index"
          >
            <td
              class="whitespace-nowrap !border-l-2 !border-gray-400 px-2 py-2 text-right text-sm text-gray-900"
              :class="{ 'qualified': entry?.qualified, 'period-closed': periods[index]!.period.status === 'closed' }"
              :title="entry?.bestMeet"
            >
              {{ entry ? secondsToTime( entry.bestTime ) : '' }}
            </td>
            <td
              class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500"
              :class="{ 'period-closed': periods[index]!.period.status === 'closed' }"
            >
              {{ entry ? format( parseISO( entry.bestDate ), "yyyy-MM-dd" ) : '' }}
            </td>
            <td
              class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500"
              :title="entry?.qualifyingConverted ? `Converted from ${row.course === 'lc' ? 'short' : 'long'} course standard` : undefined"
            >
              {{ entry ? secondsToTime( entry.qualifyingTime ) : '' }}<span v-if="entry?.qualifyingConverted">*</span>
            </td>
            <td
              class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-500"
              :class="proxClass( entry )"
            >
              {{ entry ? formatDifference( entry.difference ) : '' }}
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.qualified {
  background-color: #22c55e30;
}

.period-closed {
  font-style: italic;
}

.qualify-prox-5 {
  background-color: #f9741642;
}

.qualify-prox-10 {
  background-color: #ef444459;
}
</style>
