<script setup lang="ts">
  import { TrophyIcon } from "@heroicons/vue/24/outline"
  import type { CourseType, DistanceType, GenderType, QualifyingType, ScopeType, StrokeType } from "lib"
  import { COUNTIES, REGIONS, formatStroke, secondsToTime } from "lib"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Ranking Timer",
    meta: [
      { name: "description", content: "Compare county and regional swimming qualification times." }
    ]
  } )

  interface RankingOption {
    year: number
    gender: GenderType
    age: string
    course: CourseType
    stroke: StrokeType
    distance: DistanceType
  }

  interface RankingRow extends RankingOption {
    scope: ScopeType
    area: string
    type: QualifyingType
    timeString: string
    time: number
    position: number
    difference: number
    converted: boolean
    sourceCourse: CourseType
  }

  const { data: available, status: optionsStatus, error: optionsError } = await useFetch<RankingOption[]>(
    "/api/qualifying/ranking/options",
    { key: "qualifying-ranking-options" }
  )

  const unique = <T extends string | number>( values: T[] ) => Array.from( new Set( values ) )
  const ageOrder = ( age: string ) => Number.parseInt( age, 10 ) || Number.MAX_SAFE_INTEGER
  const distanceOrder = ( distance: string ) => Number.parseInt( distance, 10 ) || 0

  const yearOptions = computed( () => unique( ( available.value ?? [] ).map( row => row.year ) )
    .sort( ( a, b ) => b - a )
    .map( value => ( { value } ) ) )

  const selections = ref<{
    year?: number
    age?: string
    course?: CourseType
    stroke?: StrokeType
    distance?: DistanceType
  }>( {
    year: undefined,
    age: undefined,
    course: undefined,
    stroke: undefined,
    distance: undefined,
  } )

  const yearRows = computed( () => ( available.value ?? [] ).filter( row => row.year === selections.value.year ) )
  const ageRows = computed( () => yearRows.value.filter( row => row.age === selections.value.age ) )
  const courseRows = computed( () => ageRows.value.filter( row => row.course === selections.value.course ) )
  const strokeRows = computed( () => courseRows.value.filter( row => row.stroke === selections.value.stroke ) )

  const ageOptions = computed( () => unique( yearRows.value.map( row => row.age ) )
    .sort( ( a, b ) => ageOrder( a ) - ageOrder( b ) || a.localeCompare( b ) )
    .map( value => ( { value } ) ) )
  const courseOptions = computed( () => unique( ageRows.value.map( row => row.course ) )
    .map( value => ( { value, label: value === "lc" ? "Long Course" : "Short Course" } ) ) )
  const strokeOptions = computed( () => unique( courseRows.value.map( row => row.stroke ) )
    .map( value => ( { value, label: formatStroke( value ) } ) ) )
  const distanceOptions = computed( () => unique( strokeRows.value.map( row => row.distance ) )
    .sort( ( a, b ) => distanceOrder( a ) - distanceOrder( b ) )
    .map( value => ( { value } ) ) )

  const selectFirstAvailable = <T extends string | number>( current: T | undefined, options: Array<{ value: T }> ) =>
    options.some( option => option.value === current ) ? current : options[0]?.value

  watch( yearOptions, options => {
    selections.value.year = selectFirstAvailable( selections.value.year, options )
  }, { immediate: true } )
  watch( ageOptions, options => {
    selections.value.age = selectFirstAvailable( selections.value.age, options )
  }, { immediate: true } )
  watch( courseOptions, options => {
    selections.value.course = selectFirstAvailable( selections.value.course, options )
  }, { immediate: true } )
  watch( strokeOptions, options => {
    selections.value.stroke = selectFirstAvailable( selections.value.stroke, options )
  }, { immediate: true } )
  watch( distanceOptions, options => {
    selections.value.distance = selectFirstAvailable( selections.value.distance, options )
  }, { immediate: true } )

  const rankingQuery = computed( () => ( {
    year: selections.value.year,
    age: selections.value.age,
    course: selections.value.course,
    stroke: selections.value.stroke,
    distance: selections.value.distance,
  } ) )
  const filtersReady = computed( () => !!(
    rankingQuery.value.year &&
    rankingQuery.value.age &&
    rankingQuery.value.course &&
    rankingQuery.value.stroke &&
    rankingQuery.value.distance
  ) )

  const { data: ranking, status: rankingStatus, error: rankingError } = await useAsyncData<RankingRow[]>(
    "qualifying-ranking",
    () => filtersReady.value
      ? $fetch<RankingRow[]>( "/api/qualifying/ranking", { query: rankingQuery.value } )
      : Promise.resolve( [] ),
    { watch: [ rankingQuery ] }
  )

  const rowsForGender = ( gender: GenderType ) => ( ranking.value ?? [] )
    .filter( row => row.gender === gender )
    .sort( ( a, b ) => a.position - b.position || a.time - b.time || areaName( a ).localeCompare( areaName( b ) ) )

  const rankingBlocks = computed( () => [
    { key: "male", title: "Boys/Open", rows: rowsForGender( "male" ) },
    { key: "female", title: "Girls", rows: rowsForGender( "female" ) },
  ] )

  const rankCount = computed( () => unique( ( ranking.value ?? [] ).map( row => row.position ) ).length )
  const hasConvertedTimes = computed( () => ( ranking.value ?? [] ).some( row => row.converted ) )

  const areaName = ( row: Pick<RankingRow, "scope" | "area"> ) => row.scope === "county"
    ? COUNTIES[row.area as keyof typeof COUNTIES] ?? row.area
    : REGIONS[row.area as keyof typeof REGIONS] ?? row.area

  const courseName = ( course: CourseType ) => course === "lc" ? "Long Course" : "Short Course"
</script>

<template>
  <StandardPage title="Ranking Timer">
    <template #description>
      Compare qualification standards and find the fastest County or Region for a selected event.
    </template>

    <template #controls>
      <div class="min-w-24">
        <UI-Listbox v-model="selections.year" :options="yearOptions" label="Year" placeholder="Choose year" />
      </div>
      <div class="min-w-28">
        <UI-Listbox v-model="selections.age" :options="ageOptions" label="Age Group" placeholder="Choose age" />
      </div>
      <div class="min-w-40">
        <UI-Listbox v-model="selections.course" :options="courseOptions" label="Course" placeholder="Choose course" />
      </div>
      <div class="min-w-44">
        <UI-Listbox v-model="selections.stroke" :options="strokeOptions" label="Stroke" placeholder="Choose stroke" />
      </div>
      <div class="min-w-28">
        <UI-Listbox v-model="selections.distance" :options="distanceOptions" label="Distance" placeholder="Choose distance" />
      </div>
    </template>

    <div v-if="optionsStatus === 'pending' || rankingStatus === 'pending'" class="py-12 text-center text-sm text-gray-500">
      Loading qualification rankings…
    </div>

    <div v-else-if="optionsError || rankingError" class="rounded-md bg-red-50 p-4 text-sm text-red-700">
      Qualification rankings could not be loaded. Please try again.
    </div>

    <div v-else-if="ranking?.length">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <TrophyIcon class="h-5 w-5 text-amber-500" aria-hidden="true" />
        <h2 class="text-base font-semibold text-gray-900">Qualification rankings</h2>
        <span class="text-sm text-gray-500">{{ rankCount }} ranks</span>
        <span v-if="hasConvertedTimes" class="w-full text-xs italic text-gray-500 sm:ml-auto sm:w-auto">Italic times are converted</span>
      </div>

      <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <section
          v-for="block in rankingBlocks"
          :key="block.key"
          class="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          <h3 class="border-b border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-700 sm:px-4">
            {{ block.title }}
          </h3>

          <table class="w-full table-fixed">
            <caption class="sr-only">{{ block.title }} qualification rankings</caption>
            <colgroup>
              <col class="w-14 sm:w-16">
              <col>
              <col class="w-20 sm:w-24">
            </colgroup>
            <thead class="border-b border-gray-200 bg-gray-50">
              <tr>
                <th class="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600 sm:px-4 sm:text-xs">Rank</th>
                <th class="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 sm:px-4 sm:text-xs">County / Region</th>
                <th class="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600 sm:px-4 sm:text-xs">Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="( row, index ) in block.rows" :key="`${block.key}:${row.position}:${row.area}:${index}`">
                <td class="px-2 py-3 text-center align-middle text-xs font-semibold text-gray-900 sm:px-4 sm:text-sm">
                  #{{ row.position }}
                </td>
                <td class="break-words px-2 py-3 text-xs font-medium text-gray-900 sm:px-4 sm:text-sm">
                  {{ areaName( row ) }}
                </td>
                <td
                  class="whitespace-nowrap px-2 py-3 text-right align-middle font-mono text-xs font-semibold sm:px-4 sm:text-sm"
                  :class="row.position === 1 ? 'bg-amber-50/60 text-emerald-700' : 'text-gray-900'"
                >
                  <UI-Tooltip v-if="row.converted" :text="`Converted from ${courseName( row.sourceCourse )}`" position="top">
                    <span class="italic underline decoration-dotted underline-offset-4">{{ secondsToTime( row.time ) }}</span>
                  </UI-Tooltip>
                  <template v-else>{{ secondsToTime( row.time ) }}</template>
                </td>
              </tr>
              <tr v-if="!block.rows.length">
                <td colspan="3" class="px-4 py-8 text-center text-sm text-gray-500">No qualification times</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>

    <div v-else class="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
      <TrophyIcon class="mx-auto h-10 w-10 text-gray-300" aria-hidden="true" />
      <h2 class="mt-3 text-sm font-semibold text-gray-900">No qualification times found</h2>
      <p class="mt-1 text-sm text-gray-500">Try a different age group, course, stroke or distance.</p>
    </div>
  </StandardPage>
</template>
