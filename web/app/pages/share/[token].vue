<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { FetchError } from "ofetch"
  import type { Swimmer } from "lib"

  definePageMeta( {
    layout: "share",
  } )

  const route = useRoute()
  const token = route.params.token as string

  type RelativeApiResponse = InternalApi["/api/relative/:id"]["get"]
  type PersonalApiResponse = InternalApi["/api/personal/:id"]["get"]
  type QualificationsApiResponse = InternalApi["/api/share/:token/qualifications"]["get"]

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

  const { data: qualifications } = await useAsyncData(
    `share-qualifications-${token}`,
    () => {
      if ( !swimmer.value ) return Promise.resolve( { periods: [] } as QualificationsApiResponse )
      return $fetch<QualificationsApiResponse>( `/api/share/${token}/qualifications` ).catch( ( error ) => {
        if ( error instanceof FetchError && error.status === 404 ) return { periods: [] } as QualificationsApiResponse
        throw error
      } )
    }
  )

  useHead( {
    title: swimmer.value ? `${swimmer.value.firstName} ${swimmer.value.lastName} – Performance` : "Performance",
  } )
</script>

<template>
  <template v-if="swimmer">
    <div class="sm:flex sm:items-center mb-4">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">
          {{ swimmer.firstName }} {{ swimmer.lastName }} – Personal Bests
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          All-time personal best times, with rankings where the swimmer appears in the top 100 over approximately the last 12 months.
        </p>
      </div>
    </div>

    <div class="pb-4 border-b border-gray-200 mb-4">
      <div class="mt-2 bg-white shadow sm:rounded-lg">
        <p class="p-4 text-sm text-gray-700">
          Key &ndash; Personal bests are shown in <span class="time-pb">purple</span>, with dates fading as they get older.
          Ranked times are the swimmer's best in the rankings period (approximately the last 12 months) and are shown in purple if they are also the personal best.
          Event ranking is in the <span class="px-2 mr-1 rank-10" /> top 10, <span class="px-2 mr-1 rank-20" /> top 20, <span class="px-2 mr-1 rank-50" /> top 50.
          Lead is the event leader's time and Diff. is the gap to it.
        </p>
      </div>
    </div>

    <div class="mt-4 flow-root overflow-x-auto">
      <PersonalBestsTable
        :swimmer="swimmer"
        :relative-records="relativeRecords ?? []"
        :personal-records="personalRecords ?? []"
        :show-links="false"
      />
    </div>

    <div class="sm:flex sm:items-center mt-10 mb-4">
      <div class="sm:flex-auto">
        <h2 class="text-base font-semibold leading-6 text-gray-900">
          {{ swimmer.firstName }} {{ swimmer.lastName }} – Qualifications
        </h2>
        <p class="mt-2 text-sm text-gray-700">
          The swimmer's best time in each event within the current county and regional qualifying periods, compared against the qualifying standard for their age.
        </p>
      </div>
    </div>

    <div class="pb-4 border-b border-gray-200 mb-4">
      <div class="mt-2 bg-white shadow sm:rounded-lg">
        <p class="p-4 text-sm text-gray-700">
          Key &ndash; Times are the best swum within each qualifying window, so may differ between county and regional. Qualifying times that have been achieved are <span class="px-2 mr-1 qualified" /> highlighted.
          Times close to the qualifying time have differences shown <span class="px-2 mr-1 qualify-prox-5" /> if within 5%, and <span class="px-2 mr-1 qualify-prox-10" /> if within 10%.
          Times in <span class="italic">italics</span> are from a qualifying window that has closed but whose competition has not yet taken place.
          Qualifying times marked * have been converted from the other course's standard.
        </p>
      </div>
    </div>

    <div class="mt-4 flow-root overflow-x-auto">
      <QualificationsTable
        :swimmer="swimmer"
        :qualifications="qualifications ?? { periods: [] }"
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
