<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { FetchError } from "ofetch"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Personal Bests",
    meta: [
      { name: "description", content: "Swimmer personal best times and rankings" }
    ]
  } )

  const { swimmer, updated } = useSwimmer()

  type RelativeApiResponse = InternalApi["/api/relative/:id"]["get"]
  type PersonalApiResponse = InternalApi["/api/personal/:id"]["get"]

  const relativeRecords = ref<RelativeApiResponse>( [] )
  const personalRecords = ref<PersonalApiResponse>( [] )

  watchEffect( async () => {
    if ( swimmer.value ) {
      try {
        relativeRecords.value = await $fetch<RelativeApiResponse>( `/api/relative/${swimmer.value.id}` )
      } catch ( error ) {
        if ( error instanceof FetchError && error.status === 404 ) {
          relativeRecords.value = []
        } else {
          throw error
        }
      }
      try {
        personalRecords.value = await $fetch<PersonalApiResponse>( `/api/personal/${swimmer.value.id}` )
      } catch ( error ) {
        if ( error instanceof FetchError && error.status === 404 ) {
          personalRecords.value = []
        } else {
          throw error
        }
      }
    }
  } )
</script>

<template>
  <StandardPage
    title="Personal Bests"
  >
    <template #description>
      All-time personal best times, with rankings where the swimmer appears in the top 100 over approximately the last 12 months.
      For qualification against current qualifying periods see <nuxt-link
        to="/qualifying/status"
        class="text-indigo-600 hover:text-indigo-500"
      >Qualifications</nuxt-link>.
    </template>
    <template #controls>
      <SwimmerSelector
        v-model="swimmer"
        :show-label="false"
      />
      <div class="min-w-24">
        <p class="text-sm pt-1.5">
          Swimmer performance data last updated: {{ updated }}
        </p><p />
      </div>
      <ShareSwimmerButton :swimmer="swimmer" />
    </template>
    <template #key>
      Key &ndash; Personal bests are shown in <span class="time-pb">purple</span>, with dates fading as they get older.
      Ranked times are the swimmer's best in the rankings period (approximately the last 12 months) and are shown in purple if they are also the personal best.
      Event ranking is in the <span class="px-2 mr-1 rank-10" /> top 10, <span class="px-2 mr-1 rank-20" /> top 20, <span class="px-2 mr-1 rank-50" /> top 50.
      Lead is the event leader's time and Diff. is the gap to it.
    </template>

    <div>
      <div
        v-if="swimmer"
        class="inline-block min-w-full py-2 align-middle"
      >
        <PersonalBestsTable
          :swimmer="swimmer"
          :relative-records="relativeRecords"
          :personal-records="personalRecords"
        />
      </div>
    </div>
  </StandardPage>
</template>

<style scoped>
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
