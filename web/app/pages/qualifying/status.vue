<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { FetchError } from "ofetch"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Qualifications",
    meta: [
      { name: "description", content: "Swimmer times against current qualifying standards" }
    ]
  } )

  const { swimmer, updated } = useSwimmer()

  type QualificationsApiResponse = InternalApi["/api/qualifying/status/:id"]["get"]

  const qualifications = ref<QualificationsApiResponse>( { periods: [] } )

  watchEffect( async () => {
    if ( swimmer.value ) {
      try {
        qualifications.value = await $fetch<QualificationsApiResponse>( `/api/qualifying/status/${swimmer.value.id}` )
      } catch ( error ) {
        if ( error instanceof FetchError && error.status === 404 ) {
          qualifications.value = { periods: [] }
        } else {
          throw error
        }
      }
    }
  } )
</script>

<template>
  <StandardPage
    title="Qualifications"
  >
    <template #description>
      The swimmer's best time in each event within the current county and regional qualifying periods, compared against the qualifying standard for their age.
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
      Key &ndash; Times are the best swum within each qualifying window, so may differ between county and regional. Qualifying times that have been achieved are <span class="px-2 mr-1 qualified" /> highlighted.
      Times close to the qualifying time have differences shown <span class="px-2 mr-1 qualify-prox-5" /> if within 5%, and <span class="px-2 mr-1 qualify-prox-10" /> if within 10%.
      Times in <span class="italic">italics</span> are from a qualifying window that has closed but whose competition has not yet taken place.
      Qualifying times marked * have been converted from the other course's standard.
    </template>

    <div>
      <div
        v-if="swimmer"
        class="inline-block min-w-full py-2 align-middle"
      >
        <QualificationsTable
          :swimmer="swimmer"
          :qualifications="qualifications"
        />
      </div>
    </div>
  </StandardPage>
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
</style>
