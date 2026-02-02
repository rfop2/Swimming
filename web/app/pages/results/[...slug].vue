<script setup lang="ts">
  import { convertTime, COURSES, secondsToTime, strokes, ucFirst } from "lib"
  import { Line } from "vue-chartjs"
  import { Chart as ChartJS, CategoryScale, LinearScale, TimeScale, PointElement, LineElement, Title, Tooltip, Legend, type ChartData, type ChartOptions, type TooltipItem } from "chart.js"
  import "chartjs-adapter-date-fns"
  import annotationPlugin, { type AnnotationOptions } from "chartjs-plugin-annotation"

  import type { InternalApi } from "nitropack"
  import { format } from "date-fns"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Results",
    meta: [
      { name: "description", content: "Swimmer event results and history" }
    ]
  } )

  const route = useRoute()
  const slug = Array.isArray( route.params.slug ) ? route.params.slug : []

  const {
    calcActiveQualifyingPeriods,
  } = useQualifying()

  const courseOptions = Object.entries( COURSES ).map( ( [ k, v ] ) => ( { value: k, label: v } ) )
  const strokeOptions = Object.entries( strokes ).map( ( [ k, v ] ) => ( { value: k, label: v.label } ) )
  const distanceOptions = reactive<{ value: string, label: string }[]>( strokes[slug[1] ?? Object.keys( strokes )[0]!]!.distances.map( d => ( { value: d, label: d } ) ) )

  const selections = reactive( {
    course: ( courseOptions.find( option => option.value === slug[0] ) ?? courseOptions[0] )!.value,
    stroke: ( strokeOptions.find( option => option.value === slug[1] ) ?? strokeOptions[0] )!.value,
    distance: ( distanceOptions.find( option => option.value === slug[2] ) ?? distanceOptions[0] )!.value,
    period: {
      range: undefined,
      startDate: undefined,
      endDate: undefined,
    }
  } )

  watch( () => selections.stroke, ( newStroke ) => {
    distanceOptions.length = 0
    distanceOptions.push( ...strokes[newStroke]!.distances.map( d => ( { value: d, label: d } ) ) )
    if ( selections.distance && !distanceOptions.find( o => o.value === selections.distance ) )
      selections.distance = distanceOptions[0]!.value
  } )

  const rewritten = ref( false )
  onMounted( async () => {
    if ( slug.length > 0 && !rewritten.value ) {
      // Rewrite URL to /page without reloading
      window.history.replaceState( {}, "", "/results" )
      rewritten.value = true
    }
  } )

  const { swimmer } = useSwimmer()

  type ResultsApiResponse = InternalApi["/api/results/:id"]["get"]
  type ResultType = ResultsApiResponse[number]

  const records = ref<ResultsApiResponse>( [] )

  // Better type narrowing guard
  const hasSwimmer = ( s: typeof swimmer ): s is typeof swimmer & { value: NonNullable<typeof s.value> } => s.value != null && s.value !== undefined

  const activeQualifyingPeriods = computed( () => calcActiveQualifyingPeriods( swimmer.value ) )

  watchEffect( async () => {
    if ( hasSwimmer( swimmer ) ) {
      const query: {
        course: string
        stroke: string
        distance: string
        startDate?: string
        endDate?: string
      } = {
        course: selections.course,
        stroke: selections.stroke,
        distance: selections.distance,
      }
      if ( selections.period.startDate ) {
        query.startDate = selections.period.startDate
      }
      if ( selections.period.endDate ) {
        query.endDate = selections.period.endDate
      }
      records.value = await $fetch<ResultsApiResponse>( `/api/results/${swimmer.value.id}`, { query } )
      records.value.sort( ( a, b ) => {
        if ( a.date > b.date ) {
          return -1
        } else if ( a.date < b.date ) {
          return 1
        }
        if ( a.round < b.round ) {
          return 1
        } else if ( a.round > b.round ) {
          return -1
        }
        return 0
      } )
    }
  } )

  const getQualifyingTime = ( qp?: QualifyingInfo ) => {
    if ( !qp )
      return []
    // If there are qualification times speifically for this course length then return those
    const courseTimes = qp.times
      .filter( q => {
        if ( q.course !== selections.course )
          return false
        if ( q.stroke !== selections.stroke )
          return false
        if ( q.distance !== selections.distance )
          return false
        return true
      } )
      .map( q => ( { ...q, active: qp.qualifyingActive, courseTime: q.time } ) )
    if ( courseTimes.length )
      return courseTimes
    // Otherwise convert from whtever there are
    return qp.times
      .filter( q => {
        if ( q.stroke !== selections.stroke )
          return false
        if ( q.distance !== selections.distance )
          return false
        return true
      } )
      .map( q => ( { ...q, active: qp.qualifyingActive, courseTime: convertTime( q.course, selections.course, selections.stroke, selections.distance, q.time )} ) )
  }

  const qualifyingTimes = computed( () => {
    const countyQualifying = activeQualifyingPeriods.value["county"]["general"]?.period
    const summerQualifying = activeQualifyingPeriods.value["regional"]["summer"]?.period
    const winterQualifying = activeQualifyingPeriods.value["regional"]["winter"]?.period

    return [
      ...getQualifyingTime( countyQualifying ),
      ...getQualifyingTime( summerQualifying ),
      ...getQualifyingTime( winterQualifying ),
    ].sort( ( a, b ) => a.courseTime - b.courseTime )
    console.log( "Q", countyQualifying, summerQualifying, winterQualifying, qualifyingTimes.value )
  } )

  const { updateSort, getSortIcon, sortRecords } = useMultiSort<ResultType>()

  const sortedRecords = computed( () => sortRecords( records.value as Array<ResultType> ) )

  ChartJS.register(
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    annotationPlugin
  )

  const dataValues = computed( () =>
    ( records?.value || [] ).map( record => Number( record.time ) )
  )

  const data = computed<ChartData<"line", number[], string>>( () => ( {
    labels: ( records?.value || [] ).map( record => record.date ),
    datasets: [
      {
        label: "Time",
        borderColor: "#60a5fa", // line color
        borderWidth: 1.5, // line thickness
        data: dataValues.value,
        segment: {
          borderDash: ctx => {
            const p0 = ctx.p0?.parsed?.y
            const p1 = ctx.p1?.parsed?.y
            return p1! > p0! ? [ 6, 2 ] : [] // dashed if going down
          }
        },
        pointStyle: ctx => {
          const data = ctx.chart.data.datasets[0]!.data as number[]
          const minVal = Math.min( ...data )
          return ctx.parsed.y === minVal ? "rectRot" : "circle"
        },
        pointRadius: ctx => {
          const data = ctx.chart.data.datasets[0]!.data as number[]
          const minVal = Math.min( ...data )
          return ctx.parsed.y === minVal ? 4 : 2 // make diamond slightly larger
        },
      }
    ]
  } ) )

  const qualValues = computed( () =>
    Math.min( ...qualifyingTimes.value.map( q => q.courseTime ) )
  )

  const yMin = computed( () => {
    const minData = Math.min( ...dataValues.value )
    const minValue = Math.min( minData, qualValues.value )

    // Adaptive padding based on minValue
    // Small values => small padding, large values => larger padding
    const padding = Math.max( 2, Math.min( 10, Math.floor( minValue * 0.05 ) ) )

    // Round down to nearest "nice" unit
    // Example: round down to nearest multiple of 1, 5, 10, 60 seconds etc.
    // Here we can round down to nearest 1, 5, 10, 30, 60 depending on magnitude
    let scale = 1
    if ( minValue > 300 ) scale = 10
    else if ( minValue > 100 ) scale = 5
    else if ( minValue > 60 ) scale = 2
    else scale = 1

    return Math.floor( ( minValue - padding ) / scale ) * scale
  } )

  const boxColours = {
    "general": {
      colour: "#137c3a",
      background: "#22c55e30",
    },
    "summer": {
      colour: "#b65e1f",
      background: "#f9741642",
    },
    "winter": {
      colour: "#5e90be",
      background: "#3cadfd80",
    },
  }
  const boxes = computed( () => Object.fromEntries( qualifyingTimes.value.map( ( time, i ) => ( [ `zone${i + 1}`, {
    type: "box",
    yMin: ( i > 0 ) ? qualifyingTimes.value[i - 1].courseTime : 0,
    yMax: time.courseTime,
    backgroundColor: boxColours[time.type].background,
    borderWidth: 0,
    drawTime: "beforeDatasetsDraw", // <<--- important
    label: {
      display: true,
      content: `${ucFirst( time.scope === "county" ? time.scope : time.type )}: ${secondsToTime( time.courseTime )}`,
      position: "start",
      backgroundColor: boxColours[time.type].background,
      color: boxColours[time.type].colour,
      font: {
        size: 12,
        weight: "normal",
        style: time.active ? "normal" : "italic",
      },
      padding: {
        top: 4,
        right: 6,
        bottom: 4,
        left: 6,
        padding: 4,
        borderRadius: 4,
      },
    }
  } as AnnotationOptions ] ) ) ) )

  watchEffect( () => {
    console.log( "BOX", boxes.value )
  } )

  const options = computed<ChartOptions<"line">>( () => ( {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time",
        time: {
          unit: "month",
          tooltipFormat: "MMM do, yyyy"
        },
        title: {
          display: true,
          text: "Date"
        }
      },
      y: {
        title: {
          display: true,
          text: "Time"
        },
        min: yMin.value, // use computed minimum
        ticks: {
          callback: ( value ) => {
            // Chart.js may pass value as string, convert to number
            const seconds = Number( value )
            const mins = Math.floor( seconds / 60 )
            const secs = Math.floor( seconds % 60 )
            const paddedSecs = secs.toString().padStart( 2, "0" )
            return mins > 0 ? `${mins}:${paddedSecs}` : seconds
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false // Hides the legend
      },
      tooltip: {
        callbacks: {
          label: ( context: TooltipItem<"line"> ) => {
            const label = context.dataset.label || ""
            return `${label}: ${secondsToTime( context.raw as number )}`
          }
        }
      },
      annotation: {
        annotations: boxes.value,
      }
    }
  } ) )
</script>

<template>
  <StandardPage
    title="Results"
  >
    <template #description>
      Results and progress in each event. Qualifying times are shown where available, adjusted to the selected course.
    </template>
    <template #controls>
      <SwimmerSelector v-model="swimmer" />
      <div class="min-w-24">
        <UI-Listbox
          v-model="selections.course"
          :options="courseOptions"
          label="Course"
          placeholder="Choose Course"
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
      <div class="min-w-32">
        <UI-Listbox
          v-model="selections.distance"
          :options="distanceOptions"
          label="Distance"
          placeholder="Choose Distance"
        />
      </div>
      <div class="min-w-48">
        <UI-Year-Range
          v-model="selections.period"
        />
      </div>
    </template>
    <div
      v-if="data.datasets[0].data.length > 0"
    >
      <div
        class="overflow-x-auto"
      >
        <div
          id="chart-container"
          class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8"
        >
          <Line
            height="300"
            :data="data"
            :options="options"
          />
        </div>
      </div>
      <div class="overflow-x-auto">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table class="min-w-full divide-y divide-gray-300">
            <thead>
              <tr class="divide-x divide-gray-200">
                <th
                  scope="col"
                  class="sortable whitespace-nowrap align-bottom pl-4 pr-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pl-0"
                  @click="updateSort('date')"
                >
                  <span>Date</span><i :class="getSortIcon('date')" />
                </th>
                <th
                  scope="col"
                  class="whitespace-nowrap align-bottom px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
                  @click="updateSort('time')"
                >
                  <span>Time</span><i :class="getSortIcon('time')" />
                </th>
                <th
                  scope="col"
                  class="whitespace-nowrap align-bottom px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
                >
                  Points
                </th>
                <th
                  scope="col"
                  class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Round
                </th>
                <th
                  scope="col"
                  class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Meet
                </th>
                <th
                  scope="col"
                  class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Venue
                </th>
                <th
                  scope="col"
                  class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Club
                </th>
                <th
                  scope="col"
                  class="sortable whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Level
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr
                v-for="row in sortedRecords"
                :key="`${row.date}-${row.round}`"
                class="divide-x divide-gray-200"
              >
                <td class="whitespace-nowrap py-2 pl-4 pr-3 text-right text-sm font-medium text-gray-900 sm:pl-0">
                  {{ format( row.date, "yyyy-MM-dd" ) }}
                </td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-900">
                  {{ row.time ? secondsToTime( row.time ) : '' }}
                </td>
                <td class="whitespace-nowrap p-2 text-right text-sm text-gray-900">
                  {{ row.wa_pts }}
                </td>
                <td class="whitespace-nowrap p-2 text-sm text-gray-900">
                  {{ row.round === "H" ? "Heat" : ( row.round === "F" ? "Final" : "?" ) }}
                </td>
                <td class="whitespace-nowrap p-2 text-sm text-gray-900">
                  {{ row.meet }}
                </td>
                <td class="whitespace-nowrap p-2 text-sm text-gray-900">
                  {{ row.venue }}
                </td>
                <td class="whitespace-nowrap p-2 text-sm text-gray-900">
                  {{ row.club_swam_under }}
                </td>
                <td class="whitespace-nowrap py-2 pl-3 pr-4 text-sm text-gray-500 sm:pr-0">
                  {{ row.level }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div v-else>
      <p class="p-6 mx-4 text-md text-center border-2 border-solid border-gray-200 rounded-md">
        There are no results to display for the select swimmer, event and date range.
      </p>
    </div>
  </StandardPage>
</template>

<style lang="scss" scoped>
#chart-container {
  height: 400px;
}
</style>
