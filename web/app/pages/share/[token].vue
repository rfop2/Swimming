<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { FetchError } from "ofetch"
  import type { Swimmer, ExtQualifyingPeriod, QualifyingRow } from "lib"

  definePageMeta( {
    layout: "share",
  } )

  const route = useRoute()
  const token = route.params.token as string

  type RelativeApiResponse = InternalApi["/api/relative/:id"]["get"]
  type PersonalApiResponse = InternalApi["/api/personal/:id"]["get"]

  const { data: swimmer, error: swimmerError } = await useAsyncData(
    `share-swimmer-${token}`,
    () => $fetch<Swimmer>( `/api/share/${token}` )
  )

  if ( swimmerError.value ) {
    throw createError( { statusCode: 404, message: "Share link not found or expired" } )
  }

  const { data: relativeRecords } = await useAsyncData(
    `share-relative-${token}`,
    () => {
      if ( !swimmer.value ) return Promise.resolve( [] as RelativeApiResponse )
      return $fetch<RelativeApiResponse>( `/api/share/${token}/relative` ).catch( ( error ) => {
        if ( error instanceof FetchError && error.status === 404 ) return [] as RelativeApiResponse
        throw error
      } )
    }
  )

  const { data: personalRecords } = await useAsyncData(
    `share-personal-${token}`,
    () => {
      if ( !swimmer.value ) return Promise.resolve( [] as PersonalApiResponse )
      return $fetch<PersonalApiResponse>( `/api/share/${token}/personal` ).catch( ( error ) => {
        if ( error instanceof FetchError && error.status === 404 ) return [] as PersonalApiResponse
        throw error
      } )
    }
  )

  // Pre-populate useQualifying state so it doesn't attempt auth-protected fetches
  const { data: qualifying } = await useAsyncData(
    `share-qualifying-${token}`,
    () => $fetch<{ periods: ExtQualifyingPeriod[], times: QualifyingRow[] }>( `/api/share/${token}/qualifying` )
  )
  if ( qualifying.value ) {
    const qualifyingPeriods = useState<ExtQualifyingPeriod[]>( "qualifyingPeriods", () => [] )
    const qualifyingTimes = useState<QualifyingRow[]>( "qualifyingTimes", () => [] )
    const loadedPeriods = useState( "periodsLoaded", () => false )
    const loadedTimes = useState( "timesLoaded", () => false )
    qualifyingPeriods.value = qualifying.value.periods
    qualifyingTimes.value = qualifying.value.times
    loadedPeriods.value = true
    loadedTimes.value = true
  }

  useHead( {
    title: swimmer.value ? `${swimmer.value.firstName} ${swimmer.value.lastName} – Performance` : "Performance",
  } )
</script>

<template>
  <template v-if="swimmer">
        <div class="sm:flex sm:items-center mb-4">
          <div class="sm:flex-auto">
            <h1 class="text-base font-semibold leading-6 text-gray-900">
              {{ swimmer.firstName }} {{ swimmer.lastName }} – Performance
            </h1>
            <p class="mt-2 text-sm text-gray-700">
              Performance in events relative to the event leader if appearing in top 100 rankings in the last 12 months.
            </p>
          </div>
        </div>

        <div class="pb-4 border-b border-gray-200 mb-4">
          <div class="mt-2 bg-white shadow sm:rounded-lg">
            <p class="p-4 text-sm text-gray-700">
              Key &ndash; Personal best times and how they apply to current or previous qualifying periods. Qualifying times that have been achieved are <span class="px-2 mr-1 qualified" /> highlighted.
              Swim times that are close to the qualifying time have time differences shown <span class="px-2 mr-1 qualify-prox-5" /> if within 5%, and <span class="px-2 mr-1 qualify-prox-10" /> if within 10%.
              Event ranking is in the <span class="px-2 mr-1 rank-10" /> top 10, <span class="px-2 mr-1 rank-20" /> top 20, <span class="px-2 mr-1 rank-50" /> top 50. Swim times in <span class="time-pb">purple</span> are personal bests. Qualification times in <span class="italic">italics</span> mean qualification is closed.
            </p>
          </div>
        </div>

        <div class="mt-4 flow-root overflow-x-auto">
          <PerformanceTable
            :swimmer="swimmer"
            :relative-records="relativeRecords ?? []"
            :personal-records="personalRecords ?? []"
            :show-links="false"
          />
        </div>
  </template>
</template>

<style scoped>
.qualified {
  background-color: #22c55e30;
}

.qualify-prox-5 {
  background-color: #f9741642;
}

.qualify-prox-10 {
  background-color: #ef444459;
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
