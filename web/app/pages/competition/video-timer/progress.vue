<script setup lang="ts">
  import { EyeIcon } from "@heroicons/vue/24/outline"
  import { COURSES, distanceTypes, strokes } from "lib"
  import { Line } from "vue-chartjs"
  import {
    Chart as ChartJS,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    type ChartData,
    type ChartOptions,
    type TooltipItem,
    type Point,
  } from "chart.js"
  import "chartjs-adapter-date-fns"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Video Timer Progress",
    meta: [
      { name: "description", content: "Video Timer session progress for the selected event" },
    ],
  } )

  type VideoTimerProgressRow = {
    sessionId: string
    createdAt: string
    resultDate: string | null
    resultName: string | null
    swimmerId: string | null
    swimmerName: string | null
    course: string
    stroke: string
    distance: string
    officialFinishMs: number | null
    totalStrokeCount: number | null
    averageStrokeCount: number | null
    breakoutStartM: number | null
    averageTurnBreakoutM: number | null
    markerCount: number
  }

  type MetricKey =
    | "officialFinishMs"
    | "totalStrokeCount"
    | "averageStrokeCount"

  ChartJS.register(
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  )

  const courseOptions = Object.entries( COURSES ).map( ( [ k, v ] ) => ( {
    value: k,
    label: v,
  } ) )

  const strokeOptions = Object.entries( strokes ).map( ( [ k, v ] ) => ( {
    value: k,
    label: v.label,
  } ) ).concat( [ { value: "", label: "All Strokes" } ] )

  const distanceOptions = reactive<{ value: string; label: string }[]>(
    strokes[Object.keys( strokes )[0]!]!.distances.map( d => ( {
      value: d,
      label: d,
    } ) )
  )

  const metricOptions = [
    { value: "officialFinishMs", label: "Official time" },
    { value: "totalStrokeCount", label: "Total stroke count" },
    { value: "averageStrokeCount", label: "Avg stroke count" },
  ] satisfies Array<{ value: MetricKey; label: string }>

  const selections = reactive( {
    course: courseOptions[0]!.value,
    stroke: strokeOptions[0]!.value,
    distance: distanceOptions[0]!.value,
    period: {
      range: undefined,
      startDate: undefined,
      endDate: undefined,
    },
  } )

  const selectedMetric = ref<MetricKey>( "officialFinishMs" )

  watch( () => selections.stroke, newStroke => {
    distanceOptions.length = 0

    if ( newStroke ) {
      distanceOptions.push( ...strokes[newStroke]!.distances.map( d => ( {
        value: d,
        label: d,
      } ) ) )
    } else {
      distanceOptions.push( ...distanceTypes.map( d => ( {
        value: d,
        label: d,
      } ) ) )
    }

    if ( selections.distance && !distanceOptions.find( option => option.value === selections.distance ) ) {
      selections.distance = distanceOptions[0]!.value
    }
  } )

  const { swimmer } = useSwimmer()

  const records = ref<VideoTimerProgressRow[]>( [] )
  const pending = ref( false )
  const error = ref<string | null>( null )

  const hasSwimmer = ( s: typeof swimmer ): s is typeof swimmer & { value: NonNullable<typeof s.value> } =>
    s.value != null && s.value !== undefined

  watchEffect( async () => {
    if ( !hasSwimmer( swimmer ) ) {
      records.value = []
      return
    }

    pending.value = true
    error.value = null

    try {
      const query: {
        course: string
        stroke?: string
        distance: string
        startDate?: string
        endDate?: string
      } = {
        course: selections.course,
        distance: selections.distance,
      }

      if ( selections.stroke ) {
        query.stroke = selections.stroke
      }

      if ( selections.period.startDate ) {
        query.startDate = selections.period.startDate
      }

      if ( selections.period.endDate ) {
        query.endDate = selections.period.endDate
      }

      const response = await $fetch<VideoTimerProgressRow[]>(
        `/api/competition/video-timer-progress/${swimmer.value.id}`,
        { query }
      )

      records.value = [ ...( response ?? [] ) ].sort( ( a, b ) => {
        const aDate = new Date( a.resultDate ?? a.createdAt ).getTime()
        const bDate = new Date( b.resultDate ?? b.createdAt ).getTime()
        return bDate - aDate
      } )
    } catch ( e ) {
      records.value = []
      error.value = e instanceof Error && e.message
        ? e.message
        : "Failed to load video timer progress."
    } finally {
      pending.value = false
    }
  } )

  const formatDate = ( iso: string | null | undefined ) => {
    if ( !iso ) return "—"
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso

    return new Intl.DateTimeFormat( "en-GB", {
      timeZone: "Europe/London",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    } ).format( d )
  }

  const formatRaceMs = ( ms: number | null | undefined ) => {
    if ( ms === null || ms === undefined || !Number.isFinite( ms ) ) return "—"

    const totalMs = Math.max( 0, Math.round( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const minutes = Math.floor( totalSeconds / 60 )
    const seconds = String( totalSeconds % 60 ).padStart( 2, "0" )
    const centiseconds = String( Math.floor( ( totalMs % 1000 ) / 10 ) ).padStart( 2, "0" )

    return `${minutes}:${seconds}.${centiseconds}`
  }

  const formatNumber = ( value: number | null | undefined, digits = 1 ) => {
    if ( value === null || value === undefined || !Number.isFinite( value ) ) return "—"
    return Number( value ).toFixed( digits )
  }

  const bestOfficialTimeMs = computed( () => {
    const values = records.value
      .map( row => row.officialFinishMs )
      .filter( ( value ): value is number => typeof value === "number" && Number.isFinite( value ) )

    if ( !values.length ) return null

    return Math.min( ...values )
  } )

  const latestRow = computed( () => records.value[0] ?? null )

  const metricLabel = computed( () =>
    metricOptions.find( option => option.value === selectedMetric.value )?.label ?? "Metric"
  )

  const getMetricValue = ( row: VideoTimerProgressRow, key: MetricKey ) => {
    if ( key === "officialFinishMs" ) return row.officialFinishMs
    if ( key === "totalStrokeCount" ) return row.totalStrokeCount
    return row.averageStrokeCount
  }

  const formatMetricValue = ( key: MetricKey, value: number | null | undefined ) => {
    if ( key === "officialFinishMs" ) return formatRaceMs( value )
    if ( key === "totalStrokeCount" ) return formatNumber( value, 0 )
    return formatNumber( value, 1 )
  }

  const chartRows = computed( () =>
    [ ...records.value ]
      .filter( row => {
        const value = getMetricValue( row, selectedMetric.value )
        return typeof value === "number" && Number.isFinite( value )
      } )
      .sort( ( a, b ) => {
        const aTime = new Date( a.resultDate ?? a.createdAt ).getTime()
        const bTime = new Date( b.resultDate ?? b.createdAt ).getTime()
        return aTime - bTime
      } )
  )

  const hasChartData = computed( () => chartRows.value.length > 0 )

  const chartData = computed<ChartData<"line", Point[]>>( () => ( {
    datasets: [
      {
        label: metricLabel.value,
        data: chartRows.value.map( row => ( {
          x: new Date( row.resultDate ?? row.createdAt ).getTime(),
          y: Number( getMetricValue( row, selectedMetric.value ) ),
        } ) ),
        borderColor: "#2563eb",
        backgroundColor: "#2563eb",
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 3,
        pointHoverRadius: 5,
        spanGaps: true,
      },
    ],
  } ) )

  const chartOptions = computed<ChartOptions<"line">>( () => ( {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "nearest",
      intersect: false,
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "month",
          tooltipFormat: "dd/MM/yyyy",
        },
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        title: {
          display: true,
          text: metricLabel.value,
        },
        ticks: {
          callback: value => formatMetricValue( selectedMetric.value, Number( value ) ),
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: items => {
            const rawX = items[0]?.parsed?.x
            if ( !rawX ) return ""
            return formatDate( new Date( rawX ).toISOString() )
          },
          label: ( context: TooltipItem<"line"> ) =>
            `${metricLabel.value}: ${formatMetricValue( selectedMetric.value, context.parsed.y )}`,
        },
      },
    },
  } ) )
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-6xl mx-auto px-6 py-6">
        <div>
          <div class="text-lg font-semibold text-gray-900">Video Timer Progress</div>
          <div class="text-xs text-gray-500 mt-1">
            Compare saved Video Timer sessions for the selected swimmer and event.
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-end gap-3">
          <SwimmerSelector v-model="swimmer" />

          <div class="min-w-24">
            <UI-Listbox
              v-model="selections.course"
              :options="courseOptions"
              label="Course"
              placeholder="Choose Course"
            />
          </div>

          <div class="min-w-40">
            <UI-Listbox
              v-model="selections.stroke"
              :options="strokeOptions"
              label="Stroke"
              placeholder="Choose Stroke"
            />
          </div>

          <div class="min-w-24">
            <UI-Listbox
              v-model="selections.distance"
              :options="distanceOptions"
              label="Distance"
              placeholder="Choose Distance"
            />
          </div>

          <div class="min-w-40">
            <UI-Year-Range v-model="selections.period" />
          </div>
        </div>

        <div v-if="pending" class="py-4 text-sm text-gray-600">
          Loading video timer progress…
        </div>

        <div v-else-if="error" class="py-4 text-sm text-red-600">
          {{ error }}
        </div>

        <div v-else-if="records.length > 0" class="mt-4 space-y-3">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div class="text-[11px] font-medium uppercase tracking-wide text-gray-500">Sessions</div>
              <div class="mt-1 text-xl font-semibold text-gray-900">
                {{ records.length }}
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div class="text-[11px] font-medium uppercase tracking-wide text-gray-500">Best official time</div>
              <div class="mt-1 text-xl font-semibold text-gray-900">
                {{ formatRaceMs(bestOfficialTimeMs) }}
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div class="text-[11px] font-medium uppercase tracking-wide text-gray-500">Latest official time</div>
              <div class="mt-1 text-xl font-semibold text-gray-900">
                {{ formatRaceMs(latestRow?.officialFinishMs ?? null) }}
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div class="text-sm font-semibold text-gray-900">Progress chart</div>
                <div class="mt-1 text-xs text-gray-500">
                  Compare one metric over time for the current selection.
                </div>
              </div>

              <div class="w-full sm:w-56">
                <UI-Listbox
                  v-model="selectedMetric"
                  :options="metricOptions"
                  label="Metric"
                  placeholder="Choose Metric"
                />
              </div>
            </div>

            <div class="mt-4">
              <div v-if="hasChartData" class="h-[320px]">
                <Line :data="chartData" :options="chartOptions" />
              </div>

              <div v-else class="rounded-md border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                No chart data available for the selected metric.
              </div>
            </div>
          </div>

          <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr class="divide-x divide-gray-200">
                  <th class="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Date
                  </th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Result
                  </th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Official time
                  </th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Total stroke count
                  </th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Avg stroke count
                  </th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Session
                  </th>
                </tr>
              </thead>

              <tbody class="divide-y divide-gray-100 bg-white">
                <tr
                  v-for="row in records"
                  :key="row.sessionId"
                  class="divide-x divide-gray-200"
                >
                  <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-900">
                    {{ formatDate(row.resultDate ?? row.createdAt) }}
                  </td>

                  <td class="px-3 py-2 text-sm text-gray-900">
                    {{ row.resultName || "—" }}
                  </td>

                  <td class="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-900">
                    {{ formatRaceMs(row.officialFinishMs) }}
                  </td>

                  <td class="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-900">
                    {{ row.totalStrokeCount ?? "—" }}
                  </td>

                  <td class="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-900">
                    {{ formatNumber(row.averageStrokeCount) }}
                  </td>

                  <td class="whitespace-nowrap px-3 py-2 text-center">
                    <NuxtLink
                      class="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100"
                      :to="`/competition/video-timer/sessions/${row.sessionId}`"
                    >
                      <EyeIcon class="h-5 w-5 text-gray-700" />
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="mt-4">
          <p class="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600">
            There are no saved Video Timer sessions to display for the selected swimmer, event and date range.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>