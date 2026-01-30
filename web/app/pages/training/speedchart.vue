<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { FetchError } from "ofetch"
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

  const { swimmer } = useSwimmer()

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
  const effortOptions = [
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
    gender: ( genderOptions.find( option => option.value === swimmer.value?.gender ) ?? genderOptions[0] ).value,
    effort: ( effortOptions.find( option => option.label === slug[4] ) ?? effortOptions[3] )?.value,
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

  type PersonalApiResponse = InternalApi["/api/personal/:id"]["get"]
  const personalRecords = ref<PersonalApiResponse>( [] )
  watchEffect( async () => {
    if ( swimmer.value ) {
      selections.gender = swimmer.value.gender as typeof genderOptions[number]["value"]
      try {
        personalRecords.value = await $fetch<PersonalApiResponse>( `/api/personal/${swimmer.value.id}` )
      } catch ( error ) {
        if ( error instanceof FetchError ) {
          const apiError = error as FetchError
          if ( apiError.status === 404 ) {
            personalRecords.value = []
          } else {
            throw error
          }
        }
      }
    } else {
      selections.gender = genderOptions[0].value
      personalRecords.value = []
    }
  } )

  const eventRecord = computed( () => {
    const lcRecord = personalRecords.value.find( r => r.course === "lc" && r.stroke === selections.stroke && r.distance === `${selections.distance}m` )
    if ( lcRecord )
      return { course: "lc", time: lcRecord.time, record: lcRecord }
    const scRecord = personalRecords.value.find( r => r.course === "sc" && r.stroke === selections.stroke && r.distance === `${selections.distance}m` )
    if ( scRecord )
      return { course: "sc", time: scRecord.converted_time, record: scRecord }
    return undefined
  } )

  watchEffect( () => {
    console.log( "ER", eventRecord.value )
  } )

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

  const checkTime = computed( () => eventRecord.value?.time ? eventRecord.value.time / ( selections.effort ?? 1.0 ) : undefined )

  const LINES = 1
  const displayLines = computed( () => {
    if ( !checkTime.value || !eventRecord.value || !speedChart.value || !speedChart.value.length )
      return []
    console.log( "I1", checkTime.value, eventRecord.value.time, speedChart.value.length, speedChart.value[58] )
    const prevIndex = speedChart.value.findLastIndex( r => Number( Object.values( r )[0] ) < Number( checkTime.value ) )
    const nextIndex = speedChart.value.findIndex( r => Number( Object.values( r )[0] ) >= Number( checkTime.value ) )
    console.log( "I2", prevIndex, nextIndex )
    if ( !speedChart.value || !prevIndex || !nextIndex )
      return []
    return speedChart.value.slice( prevIndex, Math.min( speedChart.value.length, nextIndex + LINES ) )
  } )

  watchEffect( () => {
    console.log( "DL", displayLines.value )
  } )

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
      <SwimmerSelector v-model="swimmer" />
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
          label="Distance"
          placeholder="Choose Distance"
        />
      </div>
      <div class="min-w-32">
        <UI-Listbox
          v-model="selections.gender"
          :options="genderOptions"
          label="Gender"
          placeholder="Choose Gender"
          :disabled="!!swimmer"
        />
      </div>
      <div class="min-w-24">
        <UI-Listbox
          v-model="selections.effort"
          :options="effortOptions"
          label="Effort"
          placeholder="Choose Effort"
        />
      </div>
    </template>
    <div class="inline-block min-w-full py-2 sm:px-0">
      <table v-if="displayLines.length" class="min-w-full sm:min-w-0 sm:w-3/4 mx-auto divide-y divide-gray-300">
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
          <template
            v-for="row in displayLines"
            :key="Object.values(row)[0]"
          >
            <tr class="divide-x divide-gray-200">
              <td
                v-for="header in headers"
                :key="header"
                class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
              >
                {{ row[header] ? secondsToTime( Number( row[header] ) ) : "" }}
              </td>
            </tr>
            <tr
              v-if="checkTime && checkTime > Number( Object.values( row )[0] )"
              class="divide-x divide-gray-200"
            >
              <td
                class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
              >
                {{ secondsToTime( Number( checkTime ) ) }}
              </td>
              <td
                :colSpan="headers.length-1"
                class="whitespace-nowrap px-2 py-2 text-left text-sm text-gray-900"
              >
                <span v-if="selections.effort!=1">Adjusted from {{  secondsToTime( Number( eventRecord!.record.time ) ) }} @ </span>
                {{ `${eventRecord!.record.meet} (${eventRecord!.record.course === "lc" ? "Long" : "Short"} Course) - ${eventRecord!.record.date}` }}
                <span v-if="eventRecord!.record.course === 'sc'">{{ `(SC time: ${secondsToTime( Number( eventRecord!.record.time ) )})`  }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else-if="!eventRecord">
        <p class="p-6 mx-4 text-md text-center border-2 border-solid border-gray-200 rounded-md">
          There is no recorded time for this stroke and distance.
        </p>
      </div>
      <div v-else-if="speedChart?.length && eventRecord?.record">
        <p class="p-6 mx-4 text-md text-center border-2 border-solid border-gray-200 rounded-md">
          The {{ selections.effort === 1.0 ? "recorded" : "adjusted" }} time ({{ secondsToTime( Number( checkTime ) ) }}) is out of range of the available comparison times
          ({{ secondsToTime( Number( Object.values( speedChart[0]! )[0] ) ) }}-{{ secondsToTime( Number( Object.values( speedChart[speedChart.length-1]! )[0] ) ) }}).
        </p>
      </div>
      <div v-else>
        <p class="p-6 mx-4 text-md text-center border-2 border-solid border-gray-200 rounded-md">
          There are no times to display for the selected event.
        </p>
      </div>
    </div>
  </StandardPage>
</template>
