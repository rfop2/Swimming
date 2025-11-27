<script setup lang="ts">
  import { COURSES, strokes, secondsToTime, type Swimmer, type IndividualRow } from "lib"

  import type { InternalApi } from "nitropack"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Training",
    meta: [
      { name: "description", content: "Swimmer target times based on previous performance" }
    ]
  } )

  const route = useRoute()
  const slug = Array.isArray( route.params.slug ) ? route.params.slug : []

  const { swimmers } = useSwimmers()

  const squadOptions = computed( () => [ { label: "All Swimmers", value: "*" }, ...Array.from( swimmers.value.reduce( ( sq, s ) => {
    if ( s.squad )
      sq.add( s.squad )
    return sq
  }, new Set<string>() ) ).sort().map( s => ( { label: s, value: s } ) ), { label: "No squad", value: "" } ] )

  const strokeOptions = Object.entries( strokes ).map( ( [ k, v ] ) => ( { value: k, label: v.label } ) )
  const courseOptions = Object.entries( COURSES ).map( ( [ k, v ] ) => ( { value: k, label: v } ) )
  const baseDistanceOptions = reactive<{ value: number, label: string }[]>( strokes[slug[1] ?? Object.keys( strokes )[0]].distances.map( d => ( { value: Number( d.replace( /m$/, "" ) ), label: d } ) ) )
  const targetDistanceOptions = [ 25, 50, 75, 100, 150, 200, 300, 400 ].map( d => ( { label: `${d}m`, value: d } ) )
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

  const { state: selections } = usePersisted( "training-selection", {
    squad: ( squadOptions.value.find( option => option.value === slug[0] ) ?? squadOptions.value[0] ).value,
    stroke: ( strokeOptions.find( option => option.value === slug[1] ) ?? strokeOptions[0] ).value,
    course: ( courseOptions.find( option => option.value === slug[2] ) ?? courseOptions[0] ).value,
    baseDistance: ( baseDistanceOptions.find( option => String( option.value ) === slug[3] ) ?? baseDistanceOptions.find( d => d.label === "100m" ) ?? baseDistanceOptions[0] ).value,
    targetDistances: ( targetDistanceOptions.slice( 0, 4 ) ).map( o => o.value ),
    effort: ( effortOptions.find( option => option.label === slug[4] ) ?? effortOptions[3] ).value,
  }, "reactive" )

  watch( () => selections.stroke, ( newStroke ) => {
    baseDistanceOptions.length = 0
    baseDistanceOptions.push( ...strokes[newStroke].distances.map( d => ( { value: Number( d.replace( /m$/, "" ) ), label: d } ) ) )
    if ( selections.baseDistance && !baseDistanceOptions.find( o => o.value === selections.baseDistance ) )
      selections.baseDistance = baseDistanceOptions[0].value
  } )

  type ApiResponse = InternalApi["/api/personal"]["get"]

  interface ExtIndividualRow extends IndividualRow {
    distanceMetres: number
  }

  const { data: records } = await useFetch(
    "/api/personal/",
    {
      key: "training",
      transform: ( data: ApiResponse ): Array<ExtIndividualRow> => (
        data.map( row => ( {
          ...row,
          ...{
            // time: row.time || timeToSeconds( row.timeString ),
            // timeString: row.timeString.replace( /^0+:?/, "" ),
            distanceMetres: Number( row.distance.replace( /m$/, "" ) )
          }
        } ) )
      ),
    } )

  const bestTimes = computed( () => new Map<string, IndividualRow>( ( records.value || [] ).filter( ( r ) =>
    r.stroke === selections.stroke && r.course === selections.course && r.distanceMetres === selections.baseDistance
  ).map( record => ( [ record.swimmer, record ] ) ) ) )

  // console.log( "bt", bestTimes.value )

  const filteredSwimmers = computed( () => new Map<string, Swimmer>( ( swimmers.value || [] ).filter( swimmer => {
    // Filter by squad
    if ( selections.squad !== "*" && swimmer.squad !== selections.squad )
      return false
    if ( !bestTimes.value.has( swimmer.id ) )
      return false
    return true
  } ).map( swimmer => ( [ swimmer.id, swimmer ] ) ) ) )

  // console.log( "fs", filteredSwimmers.value )
</script>

<template>
  <StandardPage
    title="Training targets calculator"
  >
    <template #description>
      Estimated target times for fractional distances based on fastest recorded time over {{ baseDistanceOptions.find( o => o.value === selections.baseDistance)?.label }}.
    </template>
    <template #controls>
      <div class="min-w-48">
        <UI-Listbox
          v-model="selections.squad"
          :options="squadOptions"
          label="Squad"
          placeholder="Choose Squad"
        />
      </div>
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
        />
      </div>
      <div class="min-w-32">
        <UI-Listbox
          v-model="selections.baseDistance"
          :options="baseDistanceOptions"
          label="Base Distance"
          placeholder="Choose Distance"
        />
      </div>
      <div class="min-w-32">
        <UI-Listbox
          v-model="selections.targetDistances"
          :options="targetDistanceOptions"
          multiple
          label="Target Distances"
          placeholder="Choose Distances"
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
    <div class="inline-block min-w-full py-2 align-left sm:px-6 lg:px-8">
      <table class="min-w-full sm:min-w-0 sm:w-3/4 divide-y divide-gray-300">
        <thead>
          <tr class="divide-x divide-gray-200">
            <th
              scope="col"
              class="whitespace-nowrap align-bottom pl-4 pr-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pl-0"
            >
              Swimmer
            </th>
            <th
              scope="col"
              class="whitespace-nowrap align-bottom !border-r-2 !border-gray-400 px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
            >
              {{ baseDistanceOptions.find( o => o.value === selections.baseDistance )?.label }} Time
            </th>
            <th
              v-for="distance in selections.targetDistances"
              :key="distance"
              scope="col"
              class="whitespace-nowrap align-bottom px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
            >
              <span>{{ targetDistanceOptions.find( o => o.value === distance )?.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr
            v-for="swimmer in filteredSwimmers.values()"
            :key="swimmer.id"
            class="divide-x divide-gray-200"
          >
            <td
              class="whitespace-wrap sm:whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
            >
              {{ swimmer.fullName }}
            </td>
            <td
              class="whitespace-nowrap !border-r-2 !border-gray-400 px-2 py-2 text-right text-sm text-gray-900"
            >
              {{ secondsToTime( bestTimes.get( swimmer.id )?.time ?? 0, 1 ) }}
            </td>
            <td
              v-for="distance in selections.targetDistances.sort( ( a, b ) => a - b )"
              :key="distance"
              class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
            >
              {{ secondsToTime( ( ( ( bestTimes.get( swimmer.id )?.time ?? 0 ) * distance ) / ( selections.effort * selections.baseDistance ) ), 1 ) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </StandardPage>
</template>

<style scoped>
span {
  &.qualified-county {
    color: #22c55e;
  }

  &.qualified-regional {
    color: #f97416;
  }
}
</style>
