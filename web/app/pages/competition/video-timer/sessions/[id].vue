<script setup lang="ts">
import { Line } from "vue-chartjs"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from "chart.js"
import type {
  VideoTimerComputedAnalysis,
  VideoTimerMarkerRecord,
  VideoTimerStrokeCountRecord,
  VideoTimerTurnAnalysisRecord,
} from "lib"
import { parseDistanceM } from "lib"

definePageMeta( {
  layout: "secure",
  middleware: [ "protected" ],
} )

useHead( {
  title: "Video Timer Session",
} )

type SessionDetail = {
  id: string
  createdAt: string
  notes: string | null
  startOffsetMs: number | null
  selections: {
    course: string
    stroke: string
    distance: string
  }
  swimmer: {
    id: string
    fullName: string
  } | null
  meet: {
    id: string
    name: string
  } | null
  video: {
    id: string
    playbackUrl: string
    originalName: string
    mimeType: string
    size: number
    durationMs?: number
  }
  markers: VideoTimerMarkerRecord[]
  analysis: {
    breakoutStartM: number | null
  } | null
  strokeCounts: VideoTimerStrokeCountRecord[]
  turns: VideoTimerTurnAnalysisRecord[]
  computed: VideoTimerComputedAnalysis
}

type TabKey = "analysis" | "video" | "markers"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const route = useRoute()
const sessionId = computed( () => String( route.params.id ?? "" ) )
const activeTab = ref<TabKey>( "analysis" )

const { data, pending, error, refresh } = await useAsyncData(
  () => `video-timer-session-${sessionId.value}`,
  () => $fetch<SessionDetail>( `/api/competition/video-timer-sessions/${sessionId.value}` ),
  { watch: [ sessionId ] }
)

const session = computed( () => data.value ?? null )
const computedAnalysis = computed( () => session.value?.computed ?? null )

const dateFormatter = new Intl.DateTimeFormat( "en-GB", {
  timeZone: "Europe/London",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
} )

const formatDate = ( iso: string ) => {
  const d = new Date( iso )
  if ( Number.isNaN( d.getTime() ) ) return iso
  return dateFormatter.format( d )
}

const average = ( values: Array<number | null | undefined> ) => {
  const valid = values.filter( ( value ): value is number =>
    typeof value === "number" && Number.isFinite( value )
  )

  if ( !valid.length ) return null

  return valid.reduce( ( sum, value ) => sum + value, 0 ) / valid.length
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

const formatVideoMs = ( ms: number | null | undefined ) => {
  if ( ms === null || ms === undefined || !Number.isFinite( ms ) ) return "—"
  const totalMs = Math.max( 0, Math.round( ms ) )
  const totalSeconds = Math.floor( totalMs / 1000 )
  const minutes = Math.floor( totalSeconds / 60 )
  const seconds = String( totalSeconds % 60 ).padStart( 2, "0" )
  const millis = String( totalMs % 1000 ).padStart( 3, "0" )
  return `${minutes}:${seconds}.${millis}`
}

const formatNumber = ( value: number | null | undefined, digits = 2 ) => {
  if ( value === null || value === undefined || !Number.isFinite( value ) ) return "—"
  return value.toFixed( digits )
}

const formatPercent = ( value: number | null | undefined ) => {
  if ( value === null || value === undefined || !Number.isFinite( value ) ) return "—"
  return `${value.toFixed( 1 )}%`
}

const raceMsFromVideoMs = ( videoMs: number | null | undefined ) => {
  if ( videoMs === null || videoMs === undefined ) return null
  if ( session.value?.startOffsetMs === null || session.value?.startOffsetMs === undefined ) return null
  return Math.max( 0, videoMs - session.value.startOffsetMs )
}

const titleText = computed( () => {
  const selections = session.value?.selections
  if ( !selections ) return "Session"
  return `${selections.distance} ${selections.stroke} (${String( selections.course || "" ).toUpperCase() })`
} )

const useCollapsedSections = computed( () => {
  const selections = session.value?.selections
  if ( !selections ) return false
  return parseDistanceM( selections.distance ) >= 400
} )

const averageFreeSwimTimeMs = computed( () => computedAnalysis.value?.swimFree.averageTimeMs ?? null )
const averageStrokeCount = computed( () => computedAnalysis.value?.swimFree.averageStrokeCount ?? null )
const totalStrokeCount = computed( () => computedAnalysis.value?.swimFree.totalStrokeCount ?? null )

const isFiniteNumber = ( value: unknown ): value is number =>
  typeof value === "number" && Number.isFinite( value )

const metricChartLabels = computed( () => {
  const rows = computedAnalysis.value?.swimFree.rows ?? []
  return [ ...rows.map( row => row.label ), "Average" ]
} )

const metricChartData = computed<ChartData<"line", ( number | null )[], string>>( () => {
  const rows = computedAnalysis.value?.swimFree.rows ?? []
  const averageDps = computedAnalysis.value?.swimFree.averageDps ?? null
  const averageSpeed = computedAnalysis.value?.swimFree.averageSpeed ?? null
  const averageSr = computedAnalysis.value?.swimFree.averageSr ?? null

  return {
    labels: metricChartLabels.value,
    datasets: [
      {
        label: "DPS (m)",
        data: [ ...rows.map( row => row.dps ), averageDps ],
        borderColor: "#3b82f6",
        backgroundColor: "#3b82f6",
        yAxisID: "y",
        tension: 0,
        pointRadius: 3,
        pointHoverRadius: 4,
        spanGaps: true,
      },
      {
        label: "Speed (m/s)",
        data: [ ...rows.map( row => row.speed ), averageSpeed ],
        borderColor: "#ef4444",
        backgroundColor: "#ef4444",
        yAxisID: "y",
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 4,
        spanGaps: true,
      },
      {
        label: "SR (str/Min)",
        data: [ ...rows.map( row => row.sr ), averageSr ],
        borderColor: "#f59e0b",
        backgroundColor: "#f59e0b",
        yAxisID: "ySr",
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 4,
        spanGaps: true,
      },
    ],
  }
} )

const hasMetricChartData = computed( () =>
  metricChartData.value.datasets.some( dataset =>
    ( dataset.data ?? [] ).some( value => isFiniteNumber( value ) )
  )
)

const metricChartOptions = computed<ChartOptions<"line">>( () => ( {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index",
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: "bottom",
    },
    tooltip: {
      callbacks: {
        label: ( context: TooltipItem<"line"> ) => {
          const label = context.dataset.label || ""
          const value = Number( context.parsed.y )

          if ( !Number.isFinite( value ) ) return `${label}: —`
          if ( label.startsWith( "SR" ) ) return `${label}: ${value.toFixed( 1 )}`
          return `${label}: ${value.toFixed( 2 )}`
        },
      },
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: "Segment",
      },
      grid: {
        display: false,
      },
    },
    y: {
      type: "linear",
      position: "left",
      title: {
        display: true,
        text: "DPS / Speed",
      },
      ticks: {
        callback: value => Number( value ).toFixed( 2 ),
      },
    },
    ySr: {
      type: "linear",
      position: "right",
      title: {
        display: true,
        text: "SR (str/Min)",
      },
      grid: {
        drawOnChartArea: false,
      },
      ticks: {
        callback: value => Number( value ).toFixed( 1 ),
      },
    },
  },
} ) )

const tabClass = ( key: TabKey ) =>
  activeTab.value === key
    ? "border-blue-600 text-blue-700"
    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-6xl mx-auto px-6 py-6">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-lg font-semibold text-gray-900">Video Timer Session</div>
            <div class="text-xs text-gray-500 mt-1">
              Review saved video, markers and analysis.
            </div>
          </div>

          <div class="flex gap-2">
            <NuxtLink class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center" to="/competition/video-timer/sessions">
              Back to sessions
            </NuxtLink>
            <button class="h-10 px-4 rounded-md bg-gray-900 text-white" type="button" @click="refresh()">
              Refresh
            </button>
          </div>
        </div>

        <div v-if="pending" class="mt-6 text-sm text-gray-600">
          Loading…
        </div>

        <div v-else-if="error" class="mt-6 text-sm text-red-600">
          Failed to load session.
        </div>

        <div v-else-if="session && computedAnalysis" class="mt-6">
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="text-lg font-semibold text-gray-900">
                  {{ titleText }}
                </div>
                <div v-if="session.swimmer?.fullName" class="text-sm text-gray-700 mt-1">
                  {{ session.swimmer.fullName }}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ formatDate(session.createdAt) }}
                  <span v-if="session.meet?.name"> • {{ session.meet.name }}</span>
                  <span v-if="session.video.originalName"> • {{ session.video.originalName }}</span>
                  <span> • {{ session.markers.length }} markers</span>
                </div>
              </div>

              <div class="text-xs text-gray-500">
                <div>Course: <span class="font-semibold text-gray-700">{{ session.selections.course }}</span></div>
                <div>Stroke: <span class="font-semibold text-gray-700">{{ session.selections.stroke }}</span></div>
                <div>Distance: <span class="font-semibold text-gray-700">{{ session.selections.distance }}</span></div>
              </div>
            </div>

            <div class="mt-4 border-b border-gray-200">
              <nav class="flex gap-6">
                <button
                  class="border-b-2 pb-3 text-sm font-semibold transition-colors"
                  :class="tabClass('analysis')"
                  type="button"
                  @click="activeTab = 'analysis'"
                >
                  Analysis
                </button>

                <button
                  class="border-b-2 pb-3 text-sm font-semibold transition-colors"
                  :class="tabClass('video')"
                  type="button"
                  @click="activeTab = 'video'"
                >
                  Video
                </button>

                <button
                  class="border-b-2 pb-3 text-sm font-semibold transition-colors"
                  :class="tabClass('markers')"
                  type="button"
                  @click="activeTab = 'markers'"
                >
                  Markers
                </button>
              </nav>
            </div>

            <div v-if="activeTab === 'analysis'" class="mt-4 grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
              <div class="space-y-4">
                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Summary</div>

                  <div class="mt-4 space-y-3 text-sm">
                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Swimmer</div>
                      <div class="text-right text-gray-900 font-medium">{{ session.swimmer?.fullName || "—" }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Video</div>
                      <div class="text-right text-gray-900 font-medium break-all">{{ session.video.originalName || "—" }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Official time</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatRaceMs(computedAnalysis.finishTimeMs) }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Total stroke count</div>
                      <div class="text-right text-gray-900 font-medium">{{ totalStrokeCount ?? "—" }}</div>
                    </div>
                  </div>
                </div>

                <details class="rounded-xl border border-gray-200 bg-white p-4" :open="!useCollapsedSections">
                  <summary class="text-sm font-semibold text-gray-900 cursor-pointer">Lap</summary>

                  <div class="mt-4" :class="useCollapsedSections ? 'overflow-auto max-h-[360px]' : 'overflow-x-auto'">
                    <table class="min-w-full text-sm">
                      <thead>
                        <tr class="border-b border-gray-200 text-left text-gray-500">
                          <th class="py-2 pr-4 font-semibold">Segment</th>
                          <th class="py-2 pr-4 font-semibold">Split</th>
                          <th class="py-2 pr-4 font-semibold">Time</th>
                          <th class="py-2 font-semibold">%</th>
                        </tr>
                      </thead>
                      <tbody class="text-gray-900">
                        <tr
                          v-for="row in computedAnalysis.laps"
                          :key="row.lengthIndex"
                          class="border-b border-gray-100 last:border-b-0"
                        >
                          <td class="py-2 pr-4">{{ row.label }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(row.splitMs) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(row.cumulativeMs) }}</td>
                          <td class="py-2 tabular-nums">{{ formatPercent(row.pct) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>

              <div class="space-y-4">
                <details class="rounded-xl border border-gray-200 bg-white p-4" :open="!useCollapsedSections">
                  <summary class="text-sm font-semibold text-gray-900 cursor-pointer">Skills</summary>

                  <div class="mt-4">
                    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Start</div>

                    <div class="mt-2 overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b border-gray-200 text-left text-gray-500">
                            <th class="py-2 pr-4 font-semibold">10m</th>
                            <th class="py-2 font-semibold">Breakout</th>
                          </tr>
                        </thead>
                        <tbody class="text-gray-900">
                          <tr>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(computedAnalysis.start.tenMs) }}</td>
                         <td class="py-2 tabular-nums">{{ formatRaceMs(computedAnalysis.start.breakoutMs) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div class="mt-6">
                    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Turns</div>

                    <div class="mt-2" :class="useCollapsedSections ? 'overflow-auto max-h-[360px]' : 'overflow-x-auto'">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b border-gray-200 text-left text-gray-500">
                            <th class="py-2 pr-4 font-semibold">Turn</th>
                            <th class="py-2 pr-4 font-semibold">5m IN</th>
                            <th class="py-2 pr-4 font-semibold">10m OUT</th>
                            <th class="py-2 font-semibold">Breakout</th>
                          </tr>
                        </thead>
                        <tbody class="text-gray-900">
                          <tr v-for="row in computedAnalysis.turns" :key="row.turnIndex" class="border-b border-gray-100">
                            <td class="py-2 pr-4">{{ row.label }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(row.fiveInMs) }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(row.tenOutMs) }}</td>
                            <td class="py-2 tabular-nums">{{ formatRaceMs(row.breakoutMs) }}</td>
                          </tr>

                          <tr v-if="computedAnalysis.turns.length">
                            <td class="py-2 pr-4 font-medium">Average</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(average(computedAnalysis.turns.map(row => row.fiveInMs))) }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(average(computedAnalysis.turns.map(row => row.tenOutMs))) }}</td>
                            <td class="py-2 tabular-nums">{{ formatRaceMs(average(computedAnalysis.turns.map(row => row.breakoutMs))) }}</td>
                          </tr>

                          <tr v-else>
                            <td colspan="6" class="py-3 text-sm text-gray-500">No turns for this race.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div class="mt-6">
                    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Finish</div>

                    <div class="mt-2 overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b border-gray-200 text-left text-gray-500">
                            <th class="py-2 pr-4 font-semibold">5m IN</th>
                          </tr>
                        </thead>
                        <tbody class="text-gray-900">
                          <tr>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(computedAnalysis.finish.fiveInMs) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>

                <details class="rounded-xl border border-gray-200 bg-white p-4" :open="!useCollapsedSections">
                  <summary class="text-sm font-semibold text-gray-900 cursor-pointer">Swim free</summary>

                  <div class="mt-4" :class="useCollapsedSections ? 'overflow-auto max-h-[420px]' : 'overflow-x-auto'">
                    <table class="min-w-full text-sm">
                      <thead>
                        <tr class="border-b border-gray-200 text-left text-gray-500">
                          <th class="py-2 pr-4 font-semibold">Segment</th>
                          <th class="py-2 pr-4 font-semibold">Time</th>
                          <th class="py-2 pr-4 font-semibold">DPS</th>
                          <th class="py-2 pr-4 font-semibold">SR</th>
                          <th class="py-2 pr-4 font-semibold">Speed</th>
                          <th class="py-2 font-semibold">Count</th>
                        </tr>
                      </thead>
                      <tbody class="text-gray-900">
                        <tr
                          v-for="row in computedAnalysis.swimFree.rows"
                          :key="row.lengthIndex"
                          class="border-b border-gray-100"
                        >
                          <td class="py-2 pr-4">{{ row.label }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(row.timeMs) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(row.dps) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(row.sr, 1) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(row.speed) }}</td>
                          <td class="py-2 tabular-nums">{{ row.count ?? "—" }}</td>
                        </tr>

                        <tr class="border-b border-gray-100">
                          <td class="py-2 pr-4 font-medium">Average</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(averageFreeSwimTimeMs) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(computedAnalysis.swimFree.averageDps) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(computedAnalysis.swimFree.averageSr, 1) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(computedAnalysis.swimFree.averageSpeed) }}</td>
                          <td class="py-2 tabular-nums">{{ formatNumber(averageStrokeCount, 1) }}</td>
                        </tr>

                        <tr>
                          <td class="py-2 pr-4 font-medium">Total</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(computedAnalysis.finishTimeMs) }}</td>
                          <td class="py-2 pr-4 tabular-nums">—</td>
                          <td class="py-2 pr-4 tabular-nums">—</td>
                          <td class="py-2 pr-4 tabular-nums">—</td>
                          <td class="py-2 tabular-nums">{{ totalStrokeCount ?? "—" }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>

                <div v-if="session.notes" class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Notes</div>
                  <div class="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {{ session.notes }}
                  </div>
                </div>

                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Comparison chart</div>

                  <div class="mt-4">
                    <ClientOnly>
                      <div v-if="hasMetricChartData" class="h-[320px]">
                        <Line :data="metricChartData" :options="metricChartOptions" />
                      </div>

                      <div v-else class="text-sm text-gray-500">
                        No chart data available.
                      </div>
                    </ClientOnly>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="activeTab === 'video'" class="mt-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
              <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div class="p-4 text-sm font-semibold text-gray-900">
                  Video
                </div>

                <div class="bg-black">
                  <video
                    :src="session.video.playbackUrl"
                    controls
                    playsinline
                    preload="metadata"
                    class="w-full max-h-[72vh] bg-black"
                  />
                </div>
              </div>

              <div class="space-y-4">
                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Session details</div>

                  <div class="mt-4 space-y-3 text-sm">
                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Swimmer</div>
                      <div class="text-right text-gray-900 font-medium">{{ session.swimmer?.fullName || "—" }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Meet</div>
                      <div class="text-right text-gray-900 font-medium">{{ session.meet?.name || "—" }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Created</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatDate(session.createdAt) }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Video duration</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatRaceMs(session.video.durationMs ?? null) }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Start offset</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatVideoMs(session.startOffsetMs) }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Official time</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatRaceMs(computedAnalysis.finishTimeMs) }}</div>
                    </div>
                  </div>
                </div>

                <div v-if="session.notes" class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Notes</div>
                  <div class="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {{ session.notes }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div class="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <div class="text-sm font-semibold text-gray-900">Markers</div>
                <div class="text-xs text-gray-500">{{ session.markers.length }} markers</div>
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-200 text-left text-gray-500">
                      <th class="px-4 py-3 font-semibold">#</th>
                      <th class="px-4 py-3 font-semibold">Label</th>
                      <th class="px-4 py-3 font-semibold">Code</th>
                      <th class="px-4 py-3 font-semibold">Type</th>
                      <th class="px-4 py-3 font-semibold">Length</th>
                      <th class="px-4 py-3 font-semibold">Turn</th>
                      <th class="px-4 py-3 font-semibold">Video time</th>
                      <th class="px-4 py-3 font-semibold">Race time</th>
                    </tr>
                  </thead>
                  <tbody class="text-gray-900">
                    <tr
                      v-for="(marker, index) in session.markers"
                      :key="marker.id || `${marker.code}-${index}`"
                      class="border-b border-gray-100 last:border-b-0"
                    >
                      <td class="px-4 py-3 tabular-nums">{{ index + 1 }}</td>
                      <td class="px-4 py-3 font-medium">{{ marker.label }}</td>
                      <td class="px-4 py-3">{{ marker.code }}</td>
                      <td class="px-4 py-3 capitalize">{{ marker.type }}</td>
                      <td class="px-4 py-3 tabular-nums">{{ marker.lengthIndex ?? "—" }}</td>
                      <td class="px-4 py-3 tabular-nums">{{ marker.turnIndex ?? "—" }}</td>
                      <td class="px-4 py-3 tabular-nums">{{ formatVideoMs(marker.tMs) }}</td>
                      <td class="px-4 py-3 tabular-nums">{{ formatRaceMs(raceMsFromVideoMs(marker.tMs)) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="mt-6 text-sm text-gray-600">
          Session not found.
        </div>
      </div>
    </div>
  </div>
</template>