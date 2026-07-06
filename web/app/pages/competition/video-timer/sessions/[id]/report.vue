<script setup lang="ts">
  import { Line, Scatter } from "vue-chartjs"
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ScatterController,
    Title,
    Tooltip,
    Legend,
    type ChartData,
    type ChartOptions,
    type Plugin,
    type TooltipItem,
  } from "chart.js"
  import type {
    VideoTimerComputedAnalysis,
    VideoTimerBreathCountRecord,
    VideoTimerBreathMarkerRecord,
    VideoTimerMarkerRecord,
    VideoTimerStrokeCountRecord,
    VideoTimerStrokeMarkerRecord,
    VideoTimerTurnAnalysisRecord,
  } from "lib"
  import { buildVideoTimerComputedAnalysis } from "lib"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Video Timer Report",
  } )

  type ResultLink = {
    resultSwimmer: string | null
    resultCourse: string | null
    resultStroke: string | null
    resultDistance: string | null
    resultSeq: string | null
    resultDate?: string | null
  }

  type SessionDetail = {
    id: string
    createdAt: string
    notes: string | null
    startOffsetMs: number | null
    resultDate: string | null
    resultName: string | null
    resultLink?: ResultLink
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
    strokeMarkers?: VideoTimerStrokeMarkerRecord[]
    breathCounts?: VideoTimerBreathCountRecord[]
    breathMarkers?: VideoTimerBreathMarkerRecord[]
    turns: VideoTimerTurnAnalysisRecord[]
    computed: VideoTimerComputedAnalysis
  }

  type BreathTakenChartPoint = { x: number; y: number }
  type BreathCountLabelPoint = BreathTakenChartPoint & { count: number }
  type BreathMeterChartPoint = BreathTakenChartPoint & {
    distanceM: number
    lengthDistanceM: number
    lengthIndex: number
    tMs: number
    timeIntoLengthMs: number
  }

  const breathCountLabelDatasetLabel = "Breath count label"

  const isBreathCountLabelPoint = ( value: unknown ): value is BreathCountLabelPoint => {
    if ( typeof value !== "object" || value === null ) return false
    const point = value as Record<string, unknown>
    return isFiniteNumber( point.x ) && isFiniteNumber( point.y ) && isFiniteNumber( point.count )
  }

  const breathCountEndLabelPlugin: Plugin<"scatter"> = {
    id: "breathCountEndLabel",
    afterDatasetsDraw( chart ) {
      const labelDataset = chart.data.datasets.find( dataset => dataset.label === breathCountLabelDatasetLabel )
      const points = ( labelDataset?.data ?? [] ).filter( isBreathCountLabelPoint )

      if ( !points.length ) return

      const { ctx, chartArea, scales } = chart
      const yScale = scales.y

      if ( !yScale ) return

      ctx.save()
      ctx.fillStyle = "#0891b2"
      ctx.font = "600 12px sans-serif"
      ctx.textAlign = "right"
      ctx.textBaseline = "middle"

      points.forEach( point => {
        const y = yScale.getPixelForValue( point.y )
        if ( y < chartArea.top || y > chartArea.bottom ) return
        ctx.fillText( String( point.count ), chartArea.right - 8, y )
      } )

      ctx.restore()
    },
  }

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ScatterController,
    Title,
    Tooltip,
    Legend
  )

  const route = useRoute()
  const sessionId = computed( () => String( route.params.id ?? "" ) )
  const shouldAutoPrint = computed( () => route.query.print === "1" )

  const { data, pending, error } = await useFetch<SessionDetail | null>(
    () => `/api/competition/video-timer-sessions/${sessionId.value}`,
    {
      key: () => `video-timer-session-report-${sessionId.value}`,
      watch: [ sessionId ],
      default: () => null,
    }
  )

  const session = computed( () => data.value ?? null )
  const computedAnalysis = computed( () => {
    const current = session.value
    if ( !current ) return null

    return buildVideoTimerComputedAnalysis( {
      course: current.selections.course,
      distance: current.selections.distance,
      startOffsetMs: current.startOffsetMs,
      markers: current.markers,
      analysis: current.analysis,
      strokeCounts: current.strokeCounts,
      strokeMarkers: current.strokeMarkers ?? [],
      breathCounts: current.breathCounts ?? [],
      breathMarkers: current.breathMarkers ?? [],
      turns: current.turns,
    } )
  } )

  const swimLengthCount = computed( () => computedAnalysis.value?.swimFree.rows.length ?? 0 )

  const resultDateFormatter = new Intl.DateTimeFormat( "en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  } )

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

  const formatResultDate = ( iso: string | null | undefined ) => {
    if ( !iso ) return "—"
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso
    return resultDateFormatter.format( d )
  }

  const formatDate = ( iso: string ) => {
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso
    return dateFormatter.format( d )
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

  const formatNumber = ( value: number | null | undefined, digits = 2 ) => {
    if ( value === null || value === undefined || !Number.isFinite( value ) ) return "—"
    return value.toFixed( digits )
  }

  const formatPercent = ( value: number | null | undefined ) => {
    if ( value === null || value === undefined || !Number.isFinite( value ) ) return "—"
    return `${value.toFixed( 1 )}%`
  }

  const average = ( values: Array<number | null | undefined> ) => {
    const valid = values.filter( ( value ): value is number =>
      typeof value === "number" && Number.isFinite( value )
    )

    if ( !valid.length ) return null

    return valid.reduce( ( sum, value ) => sum + value, 0 ) / valid.length
  }

  const titleText = computed( () => {
    const selections = session.value?.selections
    if ( !selections ) return "Session"
    return `${selections.distance} ${selections.stroke} (${String( selections.course || "" ).toUpperCase() })`
  } )

  const averageFreeSwimTimeMs = computed( () => computedAnalysis.value?.swimFree.averageTimeMs ?? null )
  const averageStrokeCount = computed( () => computedAnalysis.value?.swimFree.averageStrokeCount ?? null )
  const averageBreathCount = computed( () => computedAnalysis.value?.swimFree.averageBreathCount ?? null )
  const totalStrokeCount = computed( () => computedAnalysis.value?.swimFree.totalStrokeCount ?? null )
  const totalBreathCount = computed( () => computedAnalysis.value?.swimFree.totalBreathCount ?? null )

  const isFiniteNumber = ( value: unknown ): value is number =>
    typeof value === "number" && Number.isFinite( value )

  const metricChartLabels = computed( () => {
    const rows = computedAnalysis.value?.swimFree.rows ?? []
    return rows.map( row => row.label )
  } )

  const repeatValue = ( value: number | null, count: number ) =>
    Array.from( { length: count }, () => value )

  const metricChartData = computed<ChartData<"line", ( number | null )[], string>>( () => {
    const rows = computedAnalysis.value?.swimFree.rows ?? []
    const pointCount = rows.length

    const averageDps = computedAnalysis.value?.swimFree.averageDps ?? null
    const averageSpeed = computedAnalysis.value?.swimFree.averageSpeed ?? null
    const averageSr = computedAnalysis.value?.swimFree.averageSr ?? null

    return {
      labels: metricChartLabels.value,
      datasets: [
        {
          label: "DPS (m)",
          data: rows.map( row => row.dps ),
          borderColor: "#3b82f6",
          backgroundColor: "#3b82f6",
          yAxisID: "y",
          tension: 0,
          pointRadius: 4,
          pointHoverRadius: 5,
          spanGaps: true,
          pointHitRadius: 6,
        },
        {
          label: "Speed (m/s)",
          data: rows.map( row => row.speed ),
          borderColor: "#ef4444",
          backgroundColor: "#ef4444",
          yAxisID: "y",
          tension: 0.25,
          pointRadius: 4,
          pointHoverRadius: 5,
          spanGaps: true,
          pointHitRadius: 6,
        },
        {
          label: "SR (str/Min)",
          data: rows.map( row => row.sr ),
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b",
          yAxisID: "ySr",
          tension: 0.25,
          pointRadius: 4,
          pointHoverRadius: 5,
          spanGaps: true,
          pointHitRadius: 6,
        },
        {
          label: "Avg DPS (m)",
          data: repeatValue( averageDps, pointCount ),
          borderColor: "#3b82f6",
          backgroundColor: "#3b82f6",
          yAxisID: "y",
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderDash: [ 6, 6 ],
          spanGaps: true,
          pointHitRadius: 0,
        },
        {
          label: "Avg Speed (m/s)",
          data: repeatValue( averageSpeed, pointCount ),
          borderColor: "#ef4444",
          backgroundColor: "#ef4444",
          yAxisID: "y",
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderDash: [ 6, 6 ],
          spanGaps: true,
          pointHitRadius: 0,
        },
        {
          label: "Avg SR (str/Min)",
          data: repeatValue( averageSr, pointCount ),
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b",
          yAxisID: "ySr",
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderDash: [ 6, 6 ],
          spanGaps: true,
          pointHitRadius: 0,
        },
      ],
    }
  } )

  const hasMetricChartData = computed( () =>
    metricChartData.value.datasets.some( dataset =>
      ( dataset.data ?? [] ).some( value => isFiniteNumber( value ) )
    )
  )

  const markerTime = ( code: string, turnIndex: number | null = null ) =>
    session.value?.markers.find( marker =>
      marker.code === code &&
      ( turnIndex === null ? true : marker.turnIndex === turnIndex )
    )?.tMs ?? null

  const raceMsFromVideoMs = ( videoMs: number | null | undefined ) => {
    if ( videoMs === null || videoMs === undefined ) return null
    if ( session.value?.startOffsetMs === null || session.value?.startOffsetMs === undefined ) return null
    return Math.max( 0, videoMs - session.value.startOffsetMs )
  }

  const breathTakenRows = computed( () =>
    ( session.value?.breathMarkers ?? [] )
      .map( marker => {
        const startMs =
          marker.lengthIndex === 1
            ? session.value?.startOffsetMs ?? null
            : markerTime( "hit_pad", marker.lengthIndex - 1 )

        const endMs =
          marker.lengthIndex < ( computedAnalysis.value?.swimFree.rows.length ?? 0 )
            ? markerTime( "hit_pad", marker.lengthIndex )
            : markerTime( "finish_time" ) ?? markerTime( "finish" )

        return {
          ...marker,
          startMs,
          endMs,
          timeIntoLengthMs: startMs !== null ? Math.max( 0, marker.tMs - startMs ) : null,
          label: `${marker.fromM} - ${marker.toM} m`,
        }
      } )
      .filter( row => row.timeIntoLengthMs !== null )
  )

  const strokeTakenRows = computed( () =>
    ( session.value?.strokeMarkers ?? [] )
      .map( marker => {
        const startMs =
          marker.lengthIndex === 1
            ? session.value?.startOffsetMs ?? null
            : markerTime( "hit_pad", marker.lengthIndex - 1 )

        const endMs =
          marker.lengthIndex < ( computedAnalysis.value?.swimFree.rows.length ?? 0 )
            ? markerTime( "hit_pad", marker.lengthIndex )
            : markerTime( "finish_time" ) ?? markerTime( "finish" )

        return {
          ...marker,
          startMs,
          endMs,
          timeIntoLengthMs: startMs !== null ? Math.max( 0, marker.tMs - startMs ) : null,
          label: `${marker.fromM} - ${marker.toM} m`,
        }
      } )
      .filter( row => row.timeIntoLengthMs !== null )
  )

  const hasBreathTakenChartData = computed( () => breathTakenRows.value.length > 0 || strokeTakenRows.value.length > 0 )

  const breathMeterRows = computed<BreathMeterChartPoint[]>( () =>
    breathTakenRows.value
      .filter( row =>
        isFiniteNumber( row.timeIntoLengthMs ) &&
        isFiniteNumber( row.startMs ) &&
        isFiniteNumber( row.endMs ) &&
        row.endMs > row.startMs &&
        row.toM > row.fromM
      )
      .map( ( row, index ) => {
        const lengthDurationMs = Math.max( 1, row.endMs! - row.startMs! )
        const progress = Math.min( 1, Math.max( 0, row.timeIntoLengthMs! / lengthDurationMs ) )
        const lengthDistanceM = progress * ( row.toM - row.fromM )
        const distanceM = row.fromM + lengthDistanceM

        return {
          x: distanceM,
          y: index + 1,
          distanceM,
          lengthDistanceM,
          lengthIndex: row.lengthIndex,
          tMs: row.tMs,
          timeIntoLengthMs: row.timeIntoLengthMs!,
        }
      } )
  )

  const strokeMeterRows = computed<BreathMeterChartPoint[]>( () =>
    strokeTakenRows.value
      .filter( row =>
        isFiniteNumber( row.timeIntoLengthMs ) &&
        isFiniteNumber( row.startMs ) &&
        isFiniteNumber( row.endMs ) &&
        row.endMs > row.startMs &&
        row.toM > row.fromM
      )
      .map( ( row, index ) => {
        const lengthDurationMs = Math.max( 1, row.endMs! - row.startMs! )
        const progress = Math.min( 1, Math.max( 0, row.timeIntoLengthMs! / lengthDurationMs ) )
        const lengthDistanceM = progress * ( row.toM - row.fromM )
        const distanceM = row.fromM + lengthDistanceM

        return {
          x: distanceM,
          y: index + 1,
          distanceM,
          lengthDistanceM,
          lengthIndex: row.lengthIndex,
          tMs: row.tMs,
          timeIntoLengthMs: row.timeIntoLengthMs!,
        }
      } )
  )

  const hasBreathMeterChartData = computed( () => breathMeterRows.value.length > 0 || strokeMeterRows.value.length > 0 )

  const breathMeterChartData = computed<ChartData<"scatter", BreathMeterChartPoint[], unknown>>( () => ( {
    datasets: [
      {
        label: "Breath marker",
        data: breathMeterRows.value,
        borderColor: "#0ea5e9",
        backgroundColor: "#0ea5e9",
        pointRadius: 5,
        pointHoverRadius: 7,
        showLine: true,
        tension: 0.2,
      },
      {
        label: "Stroke marker",
        data: strokeMeterRows.value,
        borderColor: "#7c3aed",
        backgroundColor: "#7c3aed",
        pointRadius: 4,
        pointHoverRadius: 6,
        showLine: true,
        tension: 0.2,
      },
    ],
  } ) )

  const breathMeterChartOptions = computed<ChartOptions<"scatter">>( () => ( {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label: ( context: TooltipItem<"scatter"> ) => {
            const isStroke = context.dataset.label === "Stroke marker"
            const row = isStroke ? strokeMeterRows.value[context.dataIndex] : breathMeterRows.value[context.dataIndex]
            if ( !row ) return isStroke ? "Stroke" : "Breath"
            const label = isStroke ? "Stroke" : "Breath"
            return `${label} ${row.y}: ${row.distanceM.toFixed( 1 )}m (${row.lengthDistanceM.toFixed( 1 )}m into Length ${row.lengthIndex}, ${formatRaceMs( raceMsFromVideoMs( row.tMs ) )} race time)`
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: {
          display: true,
          text: "Distance swum",
        },
        ticks: {
          callback: value => `${Number( value ).toFixed( 0 )}m`,
        },
      },
      y: {
        type: "linear",
        title: {
          display: true,
          text: "Cumulative count",
        },
        ticks: {
          precision: 0,
          stepSize: 1,
        },
      },
    },
  } ) )

  const breathCountLabelPoints = computed<BreathCountLabelPoint[]>( () =>
    ( computedAnalysis.value?.swimFree.rows ?? [] )
      .filter( row => isFiniteNumber( row.breathCount ) )
      .map( row => ( {
        x: 0,
        y: row.lengthIndex,
        count: row.breathCount,
      } ) )
  )

  const breathTakenChartData = computed<ChartData<"scatter", BreathTakenChartPoint[], unknown>>( () => ( {
    datasets: [
      {
        label: "Breath taken",
        data: breathTakenRows.value.map( row => ( {
          x: row.timeIntoLengthMs ?? 0,
          y: row.lengthIndex,
        } ) ),
        borderColor: "#f59e0b",
        backgroundColor: "#f59e0b",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: "Stroke taken",
        data: strokeTakenRows.value.map( row => ( {
          x: row.timeIntoLengthMs ?? 0,
          y: row.lengthIndex,
        } ) ),
        borderColor: "#7c3aed",
        backgroundColor: "#7c3aed",
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: breathCountLabelDatasetLabel,
        data: breathCountLabelPoints.value,
        borderColor: "transparent",
        backgroundColor: "transparent",
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
      },
    ],
  } ) )

  const breathTakenChartOptions = computed<ChartOptions<"scatter">>( () => ( {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          filter: item => item.text !== breathCountLabelDatasetLabel,
        },
      },
      tooltip: {
        filter: context => context.dataset.label !== breathCountLabelDatasetLabel,
        callbacks: {
          label: ( context: TooltipItem<"scatter"> ) => {
            const isStroke = context.dataset.label === "Stroke taken"
            const row = isStroke ? strokeTakenRows.value[context.dataIndex] : breathTakenRows.value[context.dataIndex]
            if ( !row ) return isStroke ? "Stroke" : "Breath"
            const label = isStroke ? "Stroke" : "Breath"
            return `${label} ${row.label}: ${formatRaceMs( row.timeIntoLengthMs )} into length (${formatRaceMs( raceMsFromVideoMs( row.tMs ) )} race time)`
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: {
          display: true,
          text: "Time into length",
        },
        ticks: {
          callback: value => formatRaceMs( Number( value ) ),
        },
      },
      y: {
        type: "linear",
        min: 0.5,
        max: Math.max( 1, swimLengthCount.value ) + 0.5,
        title: {
          display: true,
          text: "Length",
        },
        ticks: {
          precision: 0,
          stepSize: 1,
          callback: value => {
            const length = Number( value )
            if ( !Number.isInteger( length ) || length < 1 || length > swimLengthCount.value ) return ""
            return `Length ${length}`
          },
        },
      },
    },
  } ) )

  const metricChartOptions = computed<ChartOptions<"line">>( () => ( {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    layout: {
      padding: {
        top: 8,
        right: 12,
        bottom: 0,
        left: 8,
      },
    },
    elements: {
      line: {
        borderWidth: 2,
      },
      point: {
        radius: 4,
        hoverRadius: 5,
        hitRadius: 6,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          boxWidth: 18,
          boxHeight: 3,
          padding: 16,
          font: {
            size: 13,
            weight: "600",
          },
          filter: item => !String( item.text || "" ).startsWith( "Avg " ),
        },
      },
      tooltip: {
        titleFont: {
          size: 14,
          weight: "600",
        },
        bodyFont: {
          size: 13,
        },
        filter: context => !String( context.dataset.label || "" ).startsWith( "Avg " ),
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
          color: "#111827",
          font: {
            size: 13,
            weight: "600",
          },
        },
        ticks: {
          color: "#374151",
          font: {
            size: 12,
            weight: "600",
          },
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
          padding: 8,
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
          color: "#111827",
          font: {
            size: 13,
            weight: "600",
          },
        },
        grace: "8%",
        ticks: {
          color: "#374151",
          font: {
            size: 12,
          },
          callback: value => Number( value ).toFixed( 2 ),
        },
      },
      ySr: {
        type: "linear",
        position: "right",
        title: {
          display: true,
          text: "SR (str/Min)",
          color: "#111827",
          font: {
            size: 13,
            weight: "600",
          },
        },
        grace: "8%",
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: "#374151",
          font: {
            size: 12,
          },
          callback: value => Number( value ).toFixed( 1 ),
        },
      },
    },
  } ) )

  const printNow = () => {
    window.print()
  }

  watch(
    () => [ shouldAutoPrint.value, pending.value, session.value?.id ],
    async ( [ autoPrint, isPending, currentId ] ) => {
      if ( !autoPrint || isPending || !currentId ) return

      await nextTick()
      setTimeout( () => {
        window.print()
      }, 300 )
    },
    { immediate: true }
  )
</script>

<template>
  <div class="min-h-screen bg-gray-50 print:bg-white">
    <div class="report-wrap max-w-6xl mx-auto px-6 py-6 print:px-0 print:py-0">
      <div class="mb-6 flex items-center justify-between gap-3 print:hidden">
        <NuxtLink
          class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center"
          :to="`/competition/video-timer/sessions/${sessionId}`"
        >
          Back to session
        </NuxtLink>

        <button
          class="h-10 px-4 rounded-md bg-gray-900 text-white"
          type="button"
          @click="printNow"
        >
          Print / Save PDF
        </button>
      </div>

      <div v-if="pending" class="text-sm text-gray-600">
        Loading report…
      </div>

      <div v-else-if="error || !session || !computedAnalysis" class="text-sm text-red-600">
        Failed to load report.
      </div>

      <div v-else class="report-print-root space-y-6">
        <div class="report-card rounded-xl border border-gray-200 bg-white p-6 print:border-0 print:shadow-none">
          <div class="report-header flex items-start justify-between gap-6">
            <div class="min-w-0">
              <div class="text-2xl font-semibold text-gray-900">
                Video Timer Report
              </div>

              <div class="mt-2 text-lg font-medium text-gray-900">
                {{ titleText }}
              </div>

              <div v-if="session.swimmer?.fullName" class="mt-1 text-sm text-gray-700">
                {{ session.swimmer.fullName }}
              </div>

              <div class="mt-2 text-xs text-gray-500">
                Created at: {{ formatDate(session.createdAt) }}
                <span v-if="session.resultDate"> • Result date: {{ formatResultDate(session.resultDate) }}</span>
                <span v-if="session.resultName"> • {{ session.resultName }}</span>
              </div>
            </div>

            <div class="report-meta-block text-sm text-gray-700">
              <div>Course: <span class="font-semibold">{{ session.selections.course }}</span></div>
              <div>Stroke: <span class="font-semibold">{{ session.selections.stroke }}</span></div>
              <div>Distance: <span class="font-semibold">{{ session.selections.distance }}</span></div>
            </div>
          </div>
        </div>

        <div class="report-grid grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <div class="space-y-6">
            <div class="report-card rounded-xl border border-gray-200 bg-white p-4 break-inside-avoid">
              <div class="report-section-title text-sm font-semibold text-gray-900">Summary</div>

              <div class="mt-4 space-y-3 text-sm">
                <div class="flex items-start justify-between gap-4">
                  <div class="text-gray-500">Swimmer</div>
                  <div class="text-right text-gray-900 font-medium">{{ session.swimmer?.fullName || "—" }}</div>
                </div>

                <div class="flex items-start justify-between gap-4">
                  <div class="text-gray-500">Result date</div>
                  <div class="text-right text-gray-900 font-medium">{{ formatResultDate(session.resultDate) }}</div>
                </div>

                <div class="flex items-start justify-between gap-4">
                  <div class="text-gray-500">Result name</div>
                  <div class="text-right text-gray-900 font-medium">{{ session.resultName || "—" }}</div>
                </div>

                <div class="flex items-start justify-between gap-4">
                  <div class="text-gray-500">Official time</div>
                  <div class="text-right text-gray-900 font-medium">{{ formatRaceMs(computedAnalysis.finishTimeMs) }}</div>
                </div>

                <div class="flex items-start justify-between gap-4">
                  <div class="text-gray-500">Total stroke count</div>
                  <div class="text-right text-gray-900 font-medium">{{ totalStrokeCount ?? "—" }}</div>
                </div>

                <div class="flex items-start justify-between gap-4">
                  <div class="text-gray-500">Total breath count</div>
                  <div class="text-right text-gray-900 font-medium">{{ totalBreathCount ?? "-" }}</div>
                </div>
              </div>
            </div>

            <div class="report-card rounded-xl border border-gray-200 bg-white p-4 break-inside-avoid">
              <div class="report-section-title text-sm font-semibold text-gray-900">Lap</div>

              <div class="report-table-wrap mt-4 overflow-x-auto">
                <table class="report-table min-w-full text-sm">
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
            </div>
          </div>

          <div class="space-y-6">
            <div class="report-card rounded-xl border border-gray-200 bg-white p-4 break-inside-avoid">
              <div class="report-section-title text-sm font-semibold text-gray-900">Skills</div>

              <div class="mt-4">
                <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Start</div>

                <div class="report-table-wrap mt-2 overflow-x-auto">
                  <table class="report-table min-w-full text-sm">
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

                <div class="report-table-wrap mt-2 overflow-x-auto">
                  <table class="report-table min-w-full text-sm">
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
                        <td colspan="4" class="py-3 text-sm text-gray-500">No turns for this race.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="mt-6">
                <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Finish</div>

                <div class="report-table-wrap mt-2 overflow-x-auto">
                  <table class="report-table min-w-full text-sm">
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
            </div>

            <div class="report-card rounded-xl border border-gray-200 bg-white p-4 break-inside-avoid">
              <div class="report-section-title text-sm font-semibold text-gray-900">Swim free</div>

              <div class="report-table-wrap mt-4 overflow-x-auto">
                <table class="report-table min-w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-200 text-left text-gray-500">
                      <th class="py-2 pr-4 font-semibold">Segment</th>
                      <th class="py-2 pr-4 font-semibold">Time</th>
                      <th class="py-2 pr-4 font-semibold">DPS (m/stroke)</th>
                      <th class="py-2 pr-4 font-semibold">SR (strokes/min)</th>
                      <th class="py-2 pr-4 font-semibold">Speed (m/s)</th>
                      <th class="py-2 pr-4 font-semibold">Stroke count</th>
                      <th class="py-2 font-semibold">Breath count</th>
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
                      <td class="py-2 pr-4 tabular-nums">{{ row.count ?? "—" }}</td>
                      <td class="py-2 tabular-nums">{{ row.breathCount ?? "-" }}</td>
                    </tr>

                    <tr class="border-b border-gray-100">
                      <td class="py-2 pr-4 font-medium">Average</td>
                      <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(averageFreeSwimTimeMs) }}</td>
                      <td class="py-2 pr-4 tabular-nums">{{ formatNumber(computedAnalysis.swimFree.averageDps) }}</td>
                      <td class="py-2 pr-4 tabular-nums">{{ formatNumber(computedAnalysis.swimFree.averageSr, 1) }}</td>
                      <td class="py-2 pr-4 tabular-nums">{{ formatNumber(computedAnalysis.swimFree.averageSpeed) }}</td>
                      <td class="py-2 pr-4 tabular-nums">{{ formatNumber(averageStrokeCount, 1) }}</td>
                      <td class="py-2 tabular-nums">{{ formatNumber(averageBreathCount, 1) }}</td>
                    </tr>

                    <tr>
                      <td class="py-2 pr-4 font-medium">Total</td>
                      <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(computedAnalysis.finishTimeMs) }}</td>
                      <td class="py-2 pr-4 tabular-nums">—</td>
                      <td class="py-2 pr-4 tabular-nums">—</td>
                      <td class="py-2 pr-4 tabular-nums">—</td>
                      <td class="py-2 pr-4 tabular-nums">{{ totalStrokeCount ?? "—" }}</td>
                      <td class="py-2 tabular-nums">{{ totalBreathCount ?? "-" }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="report-card report-chart-card rounded-xl border border-gray-200 bg-white p-4 break-inside-avoid">
              <div class="report-section-title text-sm font-semibold text-gray-900">Comparison chart</div>

              <div class="mt-4">
                <ClientOnly>
                  <div v-if="hasMetricChartData" class="h-[320px] report-chart-height">
                    <Line :data="metricChartData" :options="metricChartOptions" />
                  </div>

                  <div v-else class="text-sm text-gray-500">
                    No chart data available.
                  </div>
                </ClientOnly>
              </div>
            </div>

            <div class="report-card report-chart-card rounded-xl border border-gray-200 bg-white p-4 break-inside-avoid">
              <div class="report-section-title text-sm font-semibold text-gray-900">Strokes and breaths by length</div>

              <div class="mt-4">
                <ClientOnly>
                  <div v-if="hasBreathTakenChartData" class="h-[320px] report-chart-height">
                    <Scatter
                      :data="breathTakenChartData"
                      :options="breathTakenChartOptions"
                      :plugins="[breathCountEndLabelPlugin]"
                    />
                  </div>

                  <div v-else class="text-sm text-gray-500">
                    No breath marker data available.
                  </div>
                </ClientOnly>
              </div>
            </div>

            <div class="report-card report-chart-card rounded-xl border border-gray-200 bg-white p-4 break-inside-avoid">
              <div class="report-section-title text-sm font-semibold text-gray-900">Strokes and breaths by distance</div>

              <div class="mt-4">
                <ClientOnly>
                  <div v-if="hasBreathMeterChartData" class="h-[320px] report-chart-height">
                    <Scatter :data="breathMeterChartData" :options="breathMeterChartOptions" />
                  </div>

                  <div v-else class="text-sm text-gray-500">
                    No breath marker distance data available.
                  </div>
                </ClientOnly>
              </div>
            </div>

            <div v-if="session.notes" class="report-card rounded-xl border border-gray-200 bg-white p-4 break-inside-avoid">
              <div class="report-section-title text-sm font-semibold text-gray-900">Notes</div>
              <div class="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                {{ session.notes }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@page {
  size: A4 portrait;
  margin: 10mm;
}

@media print {
  html,
  body {
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  :global(header),
  :global(nav) {
    display: none !important;
  }

  .report-wrap {
    max-width: none !important;
    width: 100% !important;
    padding: 0 !important;
  }

  .report-grid {
    display: block !important;
  }

  .report-grid > * + * {
    margin-top: 12px !important;
  }

  .report-card {
    border: 1px solid #d1d5db !important;
    border-radius: 10px !important;
    box-shadow: none !important;
    background: #fff !important;
    padding: 14px !important;
  }

  .report-header {
    display: block !important;
  }

  .report-meta-block {
    margin-top: 14px !important;
  }

  .report-section-title {
    font-size: 15px !important;
    line-height: 1.3 !important;
  }

  .report-print-root .text-2xl {
    font-size: 26px !important;
    line-height: 1.15 !important;
  }

  .report-print-root .text-lg {
    font-size: 18px !important;
    line-height: 1.3 !important;
  }

  .report-print-root .text-sm {
    font-size: 12.5px !important;
    line-height: 1.45 !important;
  }

  .report-print-root .text-xs {
    font-size: 11px !important;
    line-height: 1.45 !important;
  }

  .report-print-root .space-y-6 > * + * {
    margin-top: 12px !important;
  }

  .report-print-root .space-y-3 > * + * {
    margin-top: 10px !important;
  }

  .report-table-wrap {
    overflow: visible !important;
  }

  .report-table {
    width: 100% !important;
    table-layout: auto !important;
    font-size: 12px !important;
    line-height: 1.4 !important;
  }

  .report-table th {
    font-size: 11px !important;
    font-weight: 700 !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
    white-space: nowrap;
  }

  .report-table td {
    font-size: 12px !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
    vertical-align: top !important;
  }

  .break-inside-avoid {
    break-inside: avoid-page;
    page-break-inside: avoid;
  }

  .report-chart-card {
    break-before: page;
    page-break-before: always;
  }

  .report-chart-height {
    height: 460px !important;
  }

  canvas {
    max-width: 100% !important;
  }
}
</style>
