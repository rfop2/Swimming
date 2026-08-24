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
    gender: GenderType | ""
    age?: string
    course?: CourseType
    stroke?: StrokeType
    distance?: DistanceType
  }>( {
    year: undefined,
    gender: "",
    age: undefined,
    course: undefined,
    stroke: undefined,
    distance: undefined,
  } )

  const yearRows = computed( () => ( available.value ?? [] ).filter( row => row.year === selections.value.year ) )
  const genderRows = computed( () => yearRows.value.filter( row => !selections.value.gender || row.gender === selections.value.gender ) )
  const ageRows = computed( () => genderRows.value.filter( row => row.age === selections.value.age ) )
  const courseRows = computed( () => ageRows.value.filter( row => row.course === selections.value.course ) )
  const strokeRows = computed( () => courseRows.value.filter( row => row.stroke === selections.value.stroke ) )

  const genderOptions = [
    { value: "", label: "All genders" },
    { value: "male", label: "Open/Male" },
    { value: "female", label: "Female" },
  ] as const
  const ageOptions = computed( () => unique( genderRows.value.map( row => row.age ) )
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
    gender: selections.value.gender,
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

  const rankingsByGender = computed( () => [ "male", "female" ].map( gender => ( {
    gender: gender as GenderType,
    label: gender === "male" ? "Open/Male" : "Female",
    rows: ( ranking.value ?? [] ).filter( row => row.gender === gender ),
  } ) ).filter( group => group.rows.length > 0 ) )

  const areaName = ( row: RankingRow ) => row.scope === "county"
    ? COUNTIES[row.area as keyof typeof COUNTIES] ?? row.area
    : REGIONS[row.area as keyof typeof REGIONS] ?? row.area
  const scopeLabel = ( row: RankingRow ) => `${row.scope === "county" ? "County" : "Region"} · ${row.type[0]?.toUpperCase()}${row.type.slice( 1 )}`
  const formattedDifference = ( difference: number ) => difference > 0 ? `+${secondsToTime( difference )}` : "Fastest"
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
      <div class="min-w-36">
        <UI-Listbox v-model="selections.gender" :options="genderOptions" label="Gender" />
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

    <div v-else-if="rankingsByGender.length" class="space-y-8">
      <section v-for="group in rankingsByGender" :key="group.gender">
        <div class="mb-3 flex items-center gap-2">
          <TrophyIcon class="h-5 w-5 text-amber-500" aria-hidden="true" />
          <h2 class="text-base font-semibold text-gray-900">{{ group.label }}</h2>
          <span class="text-sm text-gray-500">{{ group.rows.length }} standards</span>
        </div>

        <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="w-20 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Rank</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">County / Region</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Standard</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Time</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Gap</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 bg-white">
                <tr v-for="row in group.rows" :key="`${row.scope}-${row.area}-${row.type}`" :class="{ 'bg-amber-50/60': row.position === 1 }">
                  <td class="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">#{{ row.position }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{{ areaName( row ) }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{{ scopeLabel( row ) }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-right font-mono text-sm font-semibold text-gray-900">{{ secondsToTime( row.time ) }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-right text-sm" :class="row.difference ? 'text-gray-500' : 'font-medium text-emerald-700'">
                    {{ formattedDifference( row.difference ) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
      <TrophyIcon class="mx-auto h-10 w-10 text-gray-300" aria-hidden="true" />
      <h2 class="mt-3 text-sm font-semibold text-gray-900">No qualification times found</h2>
      <p class="mt-1 text-sm text-gray-500">Try a different gender, age group, course, stroke or distance.</p>
    </div>
  </StandardPage>
</template>
