<script setup lang="ts">
  import { COURSES, strokes, secondsToTime } from "lib"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Speed Charts",
    meta: [
      { name: "description", content: "Training speed charts" }
    ]
  } )

  const route = useRoute()
  const slug = Array.isArray( route.params.slug ) ? route.params.slug : []

  const strokeOptions = Object.entries( strokes ).map( ( [ k, v ] ) => ( { value: k, label: v.label } ) )
  const courseOptions = Object.entries( COURSES ).map( ( [ k, v ] ) => ( { value: k, label: v } ) )
  const distanceOptions: UISelection[] = []
  const genderOptions = [
    {
      value: "male",
      label: "Open/Male",
    },
    {
      value: "female",
      label: "Female",
    },
  ] as const
  const _effortOptions = [
    {
      label: "85%",
      value: 0.85,
    },
    {
      label: "90%",
      value: 0.9,
    },
    {
      label: "95%",
      value: 0.95,
    },
    {
      label: "100%",
      value: 1.0,
    },
    {
      label: "105%",
      value: 1.05,
    },
    {
      label: "110%",
      value: 1.1,
    },
  ]

  const { state: selections } = usePersisted( "speedchart-selection", {
    stroke: ( strokeOptions.find( option => option.value === slug[0] ) ?? strokeOptions[0] )?.value as string,
    course: ( courseOptions.find( option => option.value === slug[1] ) ?? courseOptions[1] )?.value,
    distance: distanceOptions.find( option => String( option.value ) === slug[2] )?.value ?? "50",
    gender: ( genderOptions.find( option => option.value === slug[3] ) ?? genderOptions[0] ).value,
    // effort: ( effortOptions.find( option => option.label === slug[4] ) ?? effortOptions[3] ).value,
  }, "reactive" )

  const strokeDistances = computed( () => strokes[selections.stroke]?.distances )
  watch( () => selections.stroke, ( stroke ) => {
    if ( strokes[stroke] ) {
      distanceOptions.length = 0
      distanceOptions.push( ...( strokeDistances.value!.map( d => ( { value: Number( d.replace( /m$/, "" ) ), label: d } ) ) ) )
      if ( !distanceOptions.find( o => o.value === selections.distance ) ) {
        selections.distance = distanceOptions[0]?.value as string
      }
    }
  }, { immediate: true } )

  const { data: speedChart } = await useAsyncData<Array<Record<string,string>>>(
    `speedchart-${selections.stroke}-${selections.distance}-${selections.course}-${selections.gender}`,
    () =>
      $fetch<Array<Record<string,string>>>(
        `/api/speedcharts/${selections.stroke}/${selections.distance}/${selections.course}/${selections.gender}`
      ),
    {
      watch: [
        () => selections.stroke,
        () => selections.distance,
        () => selections.course,
        () => selections.gender,
      ],
    }
  )

  const distanceHeaders = {
    "50": [
      "50m Time",
      "0-15m",
      "0-20m",
      "0-25m",
      "0-30m",
      "0-35m",
      "0-40m",
      "0-45m",
      "45-50m",
      "1st 25m",
      "2nd 25m",
    ],
    "100": [
      "100m Time",
      "0-15m",
      "0-20m",
      "0-25m",
      "0-30m",
      "0-35m",
      "0-40m",
      "0-45m",
      "0-50m",
      "0-60m",
      "0-65m",
      "0-70m",
      "0-75m",
      "0-80m",
      "0-85m",
      "0-90m",
      "0-95m",
      "95-100m",
      // "Turn",
      "1st 50m",
      "2nd 50m",
    ],
    "200": [
      "200m Time",
      "0-25m",
      "0-50m",
      "0-75m",
      "0-100m",
      "0-125m",
      "0-15m",
      "0-150m",
      "0-175m",
      "175-200m",
      "1st 50m",
      "2nd 50m",
      "3rd 50m",
      "4th 50m",
    ],
  }

  const headers = computed( () => distanceHeaders[selections.distance as keyof typeof distanceHeaders] ?? [] )

</script>

<template>
  <StandardPage
    title="Swim speed chart"
  >
    <template #description>
      Target times for swim intermediate stages depending on finishing times.
    </template>
    <template #controls>
      <div class="min-w-48">
        <UI-Listbox
          v-model="selections.stroke"
          :options="strokeOptions"
          label="Stroke"
          placeholder="Choose Stroke"
        />
      </div>
      <div class="min-w-28">
        <UI-Listbox
          v-model="selections.course"
          :options="courseOptions"
          label="Course"
          placeholder="Choose Course"
          disabled
        />
      </div>
      <div class="min-w-32">
        <UI-Listbox
          v-model="selections.distance"
          :options="distanceOptions"
          label="Base Distance"
          placeholder="Choose Distance"
        />
      </div>
      <div class="min-w-32">
        <UI-Listbox
          v-model="selections.gender"
          :options="genderOptions"
          label="Gender"
          placeholder="Choose Gender"
        />
      </div>
      <!--<div class="min-w-24">
        <UI-Listbox
          v-model="selections.effort"
          :options="effortOptions"
          label="Effort"
          placeholder="Choose Effort"
        />
      </div>-->
    </template>
    <div class="inline-block min-w-full py-2 sm:px-0">
      <table v-if="speedChart && speedChart.length" class="min-w-full sm:min-w-0 sm:w-3/4 mx-auto divide-y divide-gray-300">
        <thead>
          <tr class="divide-x divide-gray-200">
            <th
              v-for="header in headers"
              :key="header"
              scope="col"
              class="whitespace-nowrap align-bottom px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
            >
              <span>{{ header }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr
            v-for="row in speedChart"
            :key="Object.values(row)[0]"
            class="divide-x divide-gray-200"
          >
            <td
              v-for="header in headers"
              :key="header"
              class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
            >
              {{ row[header] ? secondsToTime( Number( row[header] ) ) : "" }}
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else>
        <p class="p-6 mx-4 text-md text-center border-2 border-solid border-gray-200 rounded-md">
          There are no times to display for the selected event.
        </p>
      </div>
    </div>
  </StandardPage>
</template>
