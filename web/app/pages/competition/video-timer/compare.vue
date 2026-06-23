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
  import {
    buildVideoTimerComputedAnalysis,
    type VideoTimerBreathCountRecord,
    type VideoTimerBreathMarkerRecord,
    type VideoTimerComputedAnalysis,
    type VideoTimerMarkerRecord,
    type VideoTimerStrokeCountRecord,
    type VideoTimerTurnAnalysisRecord,
  } from "lib"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Video Timer Compare",
  } )

  type SessionListItem = {
    id: string
    createdAt: string
    swimmerId?: string | null
    swimmerName?: string | null
    course?: string | null
    stroke?: string | null
    distance?: string | null
    markersCount?: number | null
    videoOriginalName?: string | null
    resultName?: string | null
    resultDate?: string | null
  }

  type SessionDetail = {
    id: string
    createdAt: string
    resultDate: string | null
    resultName: string | null
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
    video: {
      originalName: string
    }
    markers: VideoTimerMarkerRecord[]
    analysis: {
      breakoutStartM: number | null
    } | null
    strokeCounts: VideoTimerStrokeCountRecord[]
    breathCounts?: VideoTimerBreathCountRecord[]
    breathMarkers?: VideoTimerBreathMarkerRecord[]
    turns: VideoTimerTurnAnalysisRecord[]
    computed: VideoTimerComputedAnalysis
  }

  type ComparisonMetric = {
    key: string
    label: string
    a: number | null
    b: number | null
    kind: "time" | "integer" | "decimal"
    digits?: number
    lowerIsBetter?: boolean
  }

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  )

  const { data: sessions, pending, error } = await useFetch<SessionListItem[]>(
    "/api/competition/video-timer-sessions",
    {
      key: "video-timer-compare-sessions",
      default: () => [],
    }
  )

  const selectedCourse = ref( "" )
  const selectedStroke = ref( "" )
  const selectedDistance = ref( "" )
  const selectedSwimmerA = ref( "" )
  const selectedSwimmerB = ref( "" )
  const selectedSessionA = ref( "" )
  const selectedSessionB = ref( "" )
  const sessionA = ref<SessionDetail | null>( null )
  const sessionB = ref<SessionDetail | null>( null )
  const loadingA = ref( false )
  const loadingB = ref( false )
  const detailError = ref<string | null>( null )

  const dateFormatter = new Intl.DateTimeFormat( "en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  } )

  const formatDate = ( iso: string | null | undefined ) => {
    if ( !iso ) return "-"
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso
    return dateFormatter.format( d )
  }

  const formatCourse = ( value: string | null | undefined ) => {
    const course = String( value ?? "" ).trim()
    return course ? course.toUpperCase() : "-"
  }

  const toTitle = ( value: string | null | undefined ) => {
    const text = String( value ?? "" ).trim()
    if ( !text ) return "-"
    return text.charAt( 0 ).toUpperCase() + text.slice( 1 )
  }

  const eventKey = ( session: Pick<SessionListItem, "course" | "stroke" | "distance"> ) =>
    [
      String( session.course ?? "" ).trim(),
      String( session.stroke ?? "" ).trim(),
      String( session.distance ?? "" ).trim(),
    ].join( "::" )

  const sortedSessions = computed( () =>
    [ ...( sessions.value ?? [] ) ].sort( ( a, b ) => {
      const aTime = new Date( a.resultDate || a.createdAt ).getTime()
      const bTime = new Date( b.resultDate || b.createdAt ).getTime()
      return bTime - aTime
    } )
  )

  const eventOptions = computed( () => {
    const map = new Map<string, { value: string; label: string; course: string; stroke: string; distance: string }>()

    for ( const item of sortedSessions.value ) {
      const course = String( item.course ?? "" ).trim()
      const stroke = String( item.stroke ?? "" ).trim()
      const distance = String( item.distance ?? "" ).trim()
      if ( !course || !stroke || !distance ) continue

      const value = eventKey( item )
      if ( map.has( value ) ) continue

      map.set( value, {
        value,
        label: `${distance} ${toTitle( stroke )} (${formatCourse( course )})`,
        course,
        stroke,
        distance,
      } )
    }

    return [ ...map.values() ].sort( ( a, b ) => a.label.localeCompare( b.label, "en-GB", { numeric: true } ) )
  } )

  const selectedEventKey = computed( {
    get: () =>
      selectedCourse.value && selectedStroke.value && selectedDistance.value
        ? [ selectedCourse.value, selectedStroke.value, selectedDistance.value ].join( "::" )
        : "",
    set: ( value: string ) => {
      const option = eventOptions.value.find( item => item.value === value )
      selectedCourse.value = option?.course ?? ""
      selectedStroke.value = option?.stroke ?? ""
      selectedDistance.value = option?.distance ?? ""
    },
  } )

  watch(
    eventOptions,
    options => {
      if ( selectedEventKey.value && options.some( option => option.value === selectedEventKey.value ) ) return
      selectedEventKey.value = options[0]?.value ?? ""
    },
    { immediate: true }
  )

  const compatibleSessions = computed( () => {
    if ( !selectedEventKey.value ) return []
    return sortedSessions.value.filter( item => eventKey( item ) === selectedEventKey.value )
  } )

  const swimmerOptions = computed( () => {
    const map = new Map<string, string>()

    for ( const item of compatibleSessions.value ) {
      const id = item.swimmerId ?? "unknown"
      const name = item.swimmerName || "Unknown swimmer"
      map.set( id, name )
    }

    return [
      { value: "", label: "All swimmers" },
      ...[ ...map.entries() ]
        .sort( ( a, b ) => a[1].localeCompare( b[1], "en-GB" ) )
        .map( ( [ value, label ] ) => ( { value, label } ) ),
    ]
  } )

  const sessionLabel = ( item: SessionListItem ) => {
    const date = formatDate( item.resultDate || item.createdAt )
    const swimmer = item.swimmerName || "Unknown swimmer"
    const result = item.resultName ? `${item.resultName} - ` : ""
    return `${swimmer} - ${result}${date}`
  }

  const makeSessionOptions = ( side: "a" | "b" ) => {
    const swimmerId = side === "a" ? selectedSwimmerA.value : selectedSwimmerB.value
    const excludedId = side === "a" ? selectedSessionB.value : selectedSessionA.value

    return compatibleSessions.value
      .filter( item => !swimmerId || ( item.swimmerId ?? "unknown" ) === swimmerId )
      .filter( item => item.id !== excludedId )
      .map( item => ( { value: item.id, label: sessionLabel( item ) } ) )
  }

  const sessionOptionsA = computed( () => makeSessionOptions( "a" ) )
  const sessionOptionsB = computed( () => makeSessionOptions( "b" ) )

  watch(
    [ compatibleSessions, sessionOptionsA, sessionOptionsB ],
    () => {
      if ( selectedSwimmerA.value && !swimmerOptions.value.some( option => option.value === selectedSwimmerA.value ) ) {
        selectedSwimmerA.value = ""
      }
      if ( selectedSwimmerB.value && !swimmerOptions.value.some( option => option.value === selectedSwimmerB.value ) ) {
        selectedSwimmerB.value = ""
      }
      if ( selectedSessionA.value && !sessionOptionsA.value.some( option => option.value === selectedSessionA.value ) ) {
        selectedSessionA.value = ""
      }
      if ( selectedSessionB.value && !sessionOptionsB.value.some( option => option.value === selectedSessionB.value ) ) {
        selectedSessionB.value = ""
      }
    },
    { immediate: true }
  )

  const loadSessionDetail = async ( id: string, side: "a" | "b" ) => {
    if ( !id ) {
      if ( side === "a" ) sessionA.value = null
      else sessionB.value = null
      return
    }

    if ( side === "a" ) loadingA.value = true
    else loadingB.value = true

    detailError.value = null

    try {
      const detail = await $fetch<SessionDetail>( `/api/competition/video-timer-sessions/${id}` )
      if ( side === "a" ) sessionA.value = detail
      else sessionB.value = detail
    } catch ( e ) {
      if ( side === "a" ) sessionA.value = null
      else sessionB.value = null
      detailError.value = e instanceof Error && e.message ? e.message : "Failed to load session details."
    } finally {
      if ( side === "a" ) loadingA.value = false
      else loadingB.value = false
    }
  }

  watch( selectedSessionA, id => {
    void loadSessionDetail( id, "a" )
  } )

  watch( selectedSessionB, id => {
    void loadSessionDetail( id, "b" )
  } )

  const computeSession = ( session: SessionDetail | null ) => {
    if ( !session ) return null
    return buildVideoTimerComputedAnalysis( {
      course: session.selections.course,
      distance: session.selections.distance,
      startOffsetMs: session.startOffsetMs,
      markers: session.markers,
      analysis: session.analysis,
      strokeCounts: session.strokeCounts,
      breathCounts: session.breathCounts ?? [],
      breathMarkers: session.breathMarkers ?? [],
      turns: session.turns,
    } )
  }

  const computedA = computed( () => computeSession( sessionA.value ) )
  const computedB = computed( () => computeSession( sessionB.value ) )

  const formatRaceMs = ( ms: number | null | undefined ) => {
    if ( ms === null || ms === undefined || !Number.isFinite( ms ) ) return "-"
    const totalMs = Math.max( 0, Math.round( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const minutes = Math.floor( totalSeconds / 60 )
    const seconds = String( totalSeconds % 60 ).padStart( 2, "0" )
    const centiseconds = String( Math.floor( ( totalMs % 1000 ) / 10 ) ).padStart( 2, "0" )
    return `${minutes}:${seconds}.${centiseconds}`
  }

  const formatNumber = ( value: number | null | undefined, digits = 1 ) => {
    if ( value === null || value === undefined || !Number.isFinite( value ) ) return "-"
    return value.toFixed( digits )
  }

  const formatSignedRaceMs = ( value: number | null ) => {
    if ( value === null || !Number.isFinite( value ) ) return "-"
    const sign = value > 0 ? "+" : value < 0 ? "-" : ""
    return `${sign}${formatRaceMs( Math.abs( value ) )}`
  }

  const formatSignedNumber = ( value: number | null, digits = 1 ) => {
    if ( value === null || !Number.isFinite( value ) ) return "-"
    const sign = value > 0 ? "+" : ""
    return `${sign}${value.toFixed( digits )}`
  }

  const delta = ( a: number | null | undefined, b: number | null | undefined ) => {
    if ( a === null || a === undefined || b === null || b === undefined ) return null
    if ( !Number.isFinite( a ) || !Number.isFinite( b ) ) return null
    return b - a
  }

  const formatMetric = ( metric: ComparisonMetric, value: number | null | undefined ) => {
    if ( metric.kind === "time" ) return formatRaceMs( value )
    if ( metric.kind === "integer" ) return formatNumber( value, 0 )
    return formatNumber( value, metric.digits ?? 2 )
  }

  const formatMetricDelta = ( metric: ComparisonMetric ) => {
    const value = delta( metric.a, metric.b )
    if ( metric.kind === "time" ) return formatSignedRaceMs( value )
    return formatSignedNumber( value, metric.kind === "integer" ? 0 : metric.digits ?? 2 )
  }

  const comparisonMetrics = computed<ComparisonMetric[]>( () => {
    const a = computedA.value
    const b = computedB.value

    return [
      {
        key: "finish",
        label: "Finish time",
        a: a?.finishTimeMs ?? null,
        b: b?.finishTimeMs ?? null,
        kind: "time",
        lowerIsBetter: true,
      },
      {
        key: "freeTime",
        label: "Avg swim free time",
        a: a?.swimFree.averageTimeMs ?? null,
        b: b?.swimFree.averageTimeMs ?? null,
        kind: "time",
        lowerIsBetter: true,
      },
      {
        key: "stroke",
        label: "Total stroke count",
        a: a?.swimFree.totalStrokeCount ?? null,
        b: b?.swimFree.totalStrokeCount ?? null,
        kind: "integer",
      },
      {
        key: "breath",
        label: "Total breath count",
        a: a?.swimFree.totalBreathCount ?? null,
        b: b?.swimFree.totalBreathCount ?? null,
        kind: "integer",
      },
      {
        key: "dps",
        label: "Average DPS",
        a: a?.swimFree.averageDps ?? null,
        b: b?.swimFree.averageDps ?? null,
        kind: "decimal",
        digits: 2,
      },
      {
        key: "sr",
        label: "Average SR",
        a: a?.swimFree.averageSr ?? null,
        b: b?.swimFree.averageSr ?? null,
        kind: "decimal",
        digits: 1,
      },
      {
        key: "speed",
        label: "Average speed",
        a: a?.swimFree.averageSpeed ?? null,
        b: b?.swimFree.averageSpeed ?? null,
        kind: "decimal",
        digits: 2,
      },
    ]
  } )

  const rowsBySegment = computed( () => {
    const aRows = computedA.value?.swimFree.rows ?? []
    const bRows = computedB.value?.swimFree.rows ?? []
    const max = Math.max( aRows.length, bRows.length )

    return Array.from( { length: max }, ( _, index ) => {
      const a = aRows[index] ?? null
      const b = bRows[index] ?? null

      return {
        key: `${a?.lengthIndex ?? b?.lengthIndex ?? index}`,
        label: a?.label ?? b?.label ?? `Segment ${index + 1}`,
        a,
        b,
      }
    } )
  } )

  const hasComparison = computed( () => !!computedA.value && !!computedB.value )

  const chartOptions = ( yTitle: string, formatter: ( value: number ) => string ): ChartOptions<"line"> => ( {
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
            return `${label}: ${Number.isFinite( value ) ? formatter( value ) : "-"}`
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
          text: yTitle,
        },
      },
    },
  } )

  const makeTwoLineChart = (
    label: string,
    aValues: Array<number | null>,
    bValues: Array<number | null>
  ): ChartData<"line", ( number | null )[], string> => ( {
    labels: rowsBySegment.value.map( row => row.label ),
    datasets: [
      {
        label: `${label} A`,
        data: aValues,
        borderColor: "#2563eb",
        backgroundColor: "#2563eb",
        tension: 0.2,
        pointRadius: 3,
        pointHoverRadius: 4,
        spanGaps: true,
      },
      {
        label: `${label} B`,
        data: bValues,
        borderColor: "#dc2626",
        backgroundColor: "#dc2626",
        tension: 0.2,
        pointRadius: 3,
        pointHoverRadius: 4,
        spanGaps: true,
      },
    ],
  } )

  const timePerLengthChart = computed( () =>
    makeTwoLineChart(
      "Time",
      rowsBySegment.value.map( row => row.a?.timeMs ?? null ),
      rowsBySegment.value.map( row => row.b?.timeMs ?? null )
    )
  )

  const strokeCountChart = computed( () =>
    makeTwoLineChart(
      "Stroke count",
      rowsBySegment.value.map( row => row.a?.count ?? null ),
      rowsBySegment.value.map( row => row.b?.count ?? null )
    )
  )

  const breathCountChart = computed( () =>
    makeTwoLineChart(
      "Breath count",
      rowsBySegment.value.map( row => row.a?.breathCount ?? null ),
      rowsBySegment.value.map( row => row.b?.breathCount ?? null )
    )
  )

  const timeChartOptions = computed( () => chartOptions( "Time", value => formatRaceMs( value ) ) )
  const countChartOptions = computed( () => chartOptions( "Count", value => value.toFixed( 0 ) ) )

  const clearComparison = () => {
    selectedSwimmerA.value = ""
    selectedSwimmerB.value = ""
    selectedSessionA.value = ""
    selectedSessionB.value = ""
  }
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-6xl mx-auto px-6 py-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-gray-900">Compare</div>
            <div class="text-xs text-gray-500 mt-1">
              Compare two saved Video Timer sessions with the same course, stroke and distance.
            </div>
          </div>

          <NuxtLink
            class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center"
            to="/competition/video-timer/sessions"
          >
            Back to sessions
          </NuxtLink>
        </div>

        <div class="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
            <UI-Listbox
              v-model="selectedEventKey"
              :options="eventOptions"
              label="Event"
              placeholder="Choose event"
            />

            <button
              class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
              type="button"
              :disabled="!selectedSessionA && !selectedSessionB && !selectedSwimmerA && !selectedSwimmerB"
              @click="clearComparison"
            >
              Clear comparison
            </button>
          </div>

          <div v-if="pending" class="mt-3 text-sm text-gray-600">Loading sessions...</div>
          <div v-else-if="error" class="mt-3 text-sm text-red-600">Failed to load sessions.</div>
          <div v-else-if="!eventOptions.length" class="mt-3 text-sm text-gray-600">
            No saved sessions are available for comparison.
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-gray-900">Session A</div>
              <div class="h-3 w-3 rounded-full bg-blue-600" />
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3">
              <UI-Listbox
                v-model="selectedSwimmerA"
                :options="swimmerOptions"
                label="Swimmer"
                placeholder="All swimmers"
              />

              <UI-Listbox
                v-model="selectedSessionA"
                :options="sessionOptionsA"
                label="Session"
                placeholder="Choose session A"
              />
            </div>

            <div v-if="loadingA" class="mt-3 text-sm text-gray-600">Loading session A...</div>
            <div v-else-if="sessionA" class="mt-4 text-sm text-gray-700 space-y-1">
              <div class="font-medium text-gray-900">{{ sessionA.swimmer?.fullName || "Unknown swimmer" }}</div>
              <div>{{ sessionA.resultName || "No linked result" }}</div>
              <div class="text-xs text-gray-500">
                {{ formatDate(sessionA.resultDate || sessionA.createdAt) }} - {{ sessionA.video.originalName }}
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-gray-900">Session B</div>
              <div class="h-3 w-3 rounded-full bg-red-600" />
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3">
              <UI-Listbox
                v-model="selectedSwimmerB"
                :options="swimmerOptions"
                label="Swimmer"
                placeholder="All swimmers"
              />

              <UI-Listbox
                v-model="selectedSessionB"
                :options="sessionOptionsB"
                label="Session"
                placeholder="Choose session B"
              />
            </div>

            <div v-if="loadingB" class="mt-3 text-sm text-gray-600">Loading session B...</div>
            <div v-else-if="sessionB" class="mt-4 text-sm text-gray-700 space-y-1">
              <div class="font-medium text-gray-900">{{ sessionB.swimmer?.fullName || "Unknown swimmer" }}</div>
              <div>{{ sessionB.resultName || "No linked result" }}</div>
              <div class="text-xs text-gray-500">
                {{ formatDate(sessionB.resultDate || sessionB.createdAt) }} - {{ sessionB.video.originalName }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="detailError" class="mt-4 text-sm text-red-600">
          {{ detailError }}
        </div>

        <div v-if="!hasComparison" class="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Choose two compatible sessions to compare.
        </div>

        <template v-else>
          <div class="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <div class="text-sm font-semibold text-gray-900">Summary</div>

            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-left text-gray-500">
                    <th class="py-2 pr-4 font-semibold">Metric</th>
                    <th class="py-2 pr-4 font-semibold">Session A</th>
                    <th class="py-2 pr-4 font-semibold">Session B</th>
                    <th class="py-2 font-semibold">Delta (B - A)</th>
                  </tr>
                </thead>
                <tbody class="text-gray-900">
                  <tr
                    v-for="metric in comparisonMetrics"
                    :key="metric.key"
                    class="border-b border-gray-100 last:border-b-0"
                  >
                    <td class="py-2 pr-4 font-medium">{{ metric.label }}</td>
                    <td class="py-2 pr-4 tabular-nums">{{ formatMetric(metric, metric.a) }}</td>
                    <td class="py-2 pr-4 tabular-nums">{{ formatMetric(metric, metric.b) }}</td>
                    <td class="py-2 tabular-nums">{{ formatMetricDelta(metric) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <div class="text-sm font-semibold text-gray-900">Segment comparison</div>

            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-left text-gray-500">
                    <th class="py-2 pr-4 font-semibold">Segment</th>
                    <th class="py-2 pr-4 font-semibold">A Time</th>
                    <th class="py-2 pr-4 font-semibold">B Time</th>
                    <th class="py-2 pr-4 font-semibold">Delta</th>
                    <th class="py-2 pr-4 font-semibold">A Stroke</th>
                    <th class="py-2 pr-4 font-semibold">B Stroke</th>
                    <th class="py-2 pr-4 font-semibold">Delta</th>
                    <th class="py-2 pr-4 font-semibold">A Breath</th>
                    <th class="py-2 pr-4 font-semibold">B Breath</th>
                    <th class="py-2 font-semibold">Delta</th>
                  </tr>
                </thead>
                <tbody class="text-gray-900">
                  <tr
                    v-for="row in rowsBySegment"
                    :key="row.key"
                    class="border-b border-gray-100 last:border-b-0"
                  >
                    <td class="py-2 pr-4 font-medium">{{ row.label }}</td>
                    <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(row.a?.timeMs) }}</td>
                    <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(row.b?.timeMs) }}</td>
                    <td class="py-2 pr-4 tabular-nums">{{ formatSignedRaceMs(delta(row.a?.timeMs, row.b?.timeMs)) }}</td>
                    <td class="py-2 pr-4 tabular-nums">{{ formatNumber(row.a?.count, 0) }}</td>
                    <td class="py-2 pr-4 tabular-nums">{{ formatNumber(row.b?.count, 0) }}</td>
                    <td class="py-2 pr-4 tabular-nums">{{ formatSignedNumber(delta(row.a?.count, row.b?.count), 0) }}</td>
                    <td class="py-2 pr-4 tabular-nums">{{ formatNumber(row.a?.breathCount, 0) }}</td>
                    <td class="py-2 pr-4 tabular-nums">{{ formatNumber(row.b?.breathCount, 0) }}</td>
                    <td class="py-2 tabular-nums">{{ formatSignedNumber(delta(row.a?.breathCount, row.b?.breathCount), 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div class="rounded-xl border border-gray-200 bg-white p-4">
              <div class="text-sm font-semibold text-gray-900">Time per length</div>
              <div class="mt-4 h-[300px]">
                <ClientOnly>
                  <Line :data="timePerLengthChart" :options="timeChartOptions" />
                </ClientOnly>
              </div>
            </div>

            <div class="rounded-xl border border-gray-200 bg-white p-4">
              <div class="text-sm font-semibold text-gray-900">Stroke count per length</div>
              <div class="mt-4 h-[300px]">
                <ClientOnly>
                  <Line :data="strokeCountChart" :options="countChartOptions" />
                </ClientOnly>
              </div>
            </div>

            <div class="rounded-xl border border-gray-200 bg-white p-4">
              <div class="text-sm font-semibold text-gray-900">Breath count per length</div>
              <div class="mt-4 h-[300px]">
                <ClientOnly>
                  <Line :data="breathCountChart" :options="countChartOptions" />
                </ClientOnly>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
