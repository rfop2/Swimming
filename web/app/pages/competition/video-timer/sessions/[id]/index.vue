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
  import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue"
  import { ChevronDownIcon } from "@heroicons/vue/24/outline"
  import type {
    VideoTimerComputedAnalysis,
    VideoTimerBreathCountRecord,
    VideoTimerBreathMarkerRecord,
    VideoTimerMarkerRecord,
    VideoTimerStrokeCountRecord,
    VideoTimerStrokeMarkerRecord,
    VideoTimerTurnAnalysisRecord,
  } from "lib"
  import { buildVideoTimerComputedAnalysis, parseDistanceM } from "lib"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Video Timer Session",
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

  type TabKey = "analysis" | "video" | "markers"
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
  const activeTab = ref<TabKey>( "analysis" )
  const resultModalOpen = ref( false )

  const resultDateFormatter = new Intl.DateTimeFormat( "en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  } )

  const formatResultDate = ( iso: string | null | undefined ) => {
    if ( !iso ) return "—"
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso
    return resultDateFormatter.format( d )
  }

  const { data, pending, error, refresh } = await useFetch<SessionDetail | null>(
    () => `/api/competition/video-timer-sessions/${sessionId.value}`,
    {
      key: () => `video-timer-session-${sessionId.value}`,
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
          pointRadius: 3,
          pointHoverRadius: 4,
          spanGaps: true,
          pointHitRadius: 0,
        },
        {
          label: "Speed (m/s)",
          data: rows.map( row => row.speed ),
          borderColor: "#ef4444",
          backgroundColor: "#ef4444",
          yAxisID: "y",
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 4,
          spanGaps: true,
          pointHitRadius: 0,
        },
        {
          label: "SR (str/Min)",
          data: rows.map( row => row.sr ),
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b",
          yAxisID: "ySr",
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 4,
          spanGaps: true,
          pointHitRadius: 0,
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
        labels: {
          filter: item => !String( item.text || "" ).startsWith( "Avg " ),
        },
      },
      tooltip: {
        filter: ( context ) => !String( context.dataset.label || "" ).startsWith( "Avg " ),
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

  const lapTimeChartLabels = computed( () => {
    const laps = computedAnalysis.value?.laps ?? []
    return laps.map( row => row.label )
  } )

  const lapTimeChartData = computed<ChartData<"line", ( number | null )[], string>>( () => {
    const laps = computedAnalysis.value?.laps ?? []
    const averageLapTime = average( laps.map( row => row.splitMs ) )

    return {
      labels: lapTimeChartLabels.value,
      datasets: [
        {
          label: "Time per length",
          data: laps.map( row => row.splitMs ),
          borderColor: "#10b981",
          backgroundColor: "#10b981",
          yAxisID: "y",
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 4,
          spanGaps: true,
          pointHitRadius: 0,
        },
        {
          label: "Avg time per length",
          data: repeatValue( averageLapTime, laps.length ),
          borderColor: "#10b981",
          backgroundColor: "#10b981",
          yAxisID: "y",
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

  const hasLapTimeChartData = computed( () =>
    lapTimeChartData.value.datasets.some( dataset =>
      ( dataset.data ?? [] ).some( value => isFiniteNumber( value ) )
    )
  )

  const markerTime = ( code: string, turnIndex: number | null = null ) =>
    session.value?.markers.find( marker =>
      marker.code === code &&
      ( turnIndex === null ? true : marker.turnIndex === turnIndex )
    )?.tMs ?? null

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

  const lapTimeChartOptions = computed<ChartOptions<"line">>( () => ( {
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
        labels: {
          filter: item => !String( item.text || "" ).startsWith( "Avg " ),
        },
      },
      tooltip: {
        filter: ( context ) => !String( context.dataset.label || "" ).startsWith( "Avg " ),
        callbacks: {
          label: ( context: TooltipItem<"line"> ) => {
            const label = context.dataset.label || ""
            const value = Number( context.parsed.y )

            if ( !Number.isFinite( value ) ) return `${label}: —`
            return `${label}: ${formatRaceMs( value )}`
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Length",
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
          text: "Time",
        },
        ticks: {
          callback: value => formatRaceMs( Number( value ) ),
        },
      },
    },
  } ) )

  const tabClass = ( key: TabKey ) =>
    activeTab.value === key
      ? "border-blue-600 text-blue-700"
      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"

  const deleting = ref( false )
  const deleteError = ref<string | null>( null )

  const getErrorMessage = ( e: unknown ) => {
    if ( typeof e === "string" && e.trim() ) return e

    if ( e && typeof e === "object" ) {
      const obj = e as {
        data?: { statusMessage?: unknown; message?: unknown }
        message?: unknown
      }

      const msg = obj.data?.statusMessage ?? obj.data?.message ?? obj.message
      if ( typeof msg === "string" && msg.trim() ) return msg
    }

    return "Failed to delete session."
  }

  const deleteSession = async () => {
    if ( !session.value || deleting.value ) return

    const confirmed = window.confirm( "Are you sure you want to delete this session?" )
    if ( !confirmed ) return

    deleteError.value = null
    deleting.value = true

    try {
      await $fetch( `/api/competition/video-timer-sessions/${sessionId.value}`, {
        method: "DELETE",
      } )

      await navigateTo( "/competition/video-timer/sessions" )
    } catch ( e: unknown ) {
      deleteError.value = getErrorMessage( e )
    } finally {
      deleting.value = false
    }
  }

  const openResultModal = () => {
    resultModalOpen.value = true
  }

  const closeResultModal = () => {
    resultModalOpen.value = false
  }

  const onResultSaved = async () => {
    await refresh()
  }
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

          <div class="flex flex-wrap items-center justify-end gap-2">
            <NuxtLink
              class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center"
              to="/competition/video-timer/sessions"
            >
              Back to sessions
            </NuxtLink>

            <NuxtLink
              v-if="session"
              class="h-10 px-4 rounded-md bg-blue-600 text-white flex items-center"
              :to="`/competition/video-timer/sessions/${session.id}/edit`"
            >
              Edit session
            </NuxtLink>

            <Menu v-if="session" as="div" class="relative">
              <MenuButton class="h-10 px-4 rounded-md bg-gray-900 text-white flex items-center gap-2">
                Actions
                <ChevronDownIcon class="h-4 w-4" />
              </MenuButton>

              <transition
                enter-active-class="transition duration-100 ease-out"
                enter-from-class="transform scale-95 opacity-0"
                enter-to-class="transform scale-100 opacity-100"
                leave-active-class="transition duration-75 ease-in"
                leave-from-class="transform scale-100 opacity-100"
                leave-to-class="transform scale-95 opacity-0"
              >
                <MenuItems class="absolute right-0 z-20 mt-2 w-52 origin-top-right rounded-xl border border-gray-200 bg-white p-1 shadow-lg focus:outline-none">
                  <MenuItem v-slot="{ active }">
                    <NuxtLink
                      :to="`/competition/video-timer/sessions/${session.id}/report`"
                      target="_blank"
                      class="flex w-full items-center rounded-lg px-3 py-2 text-sm"
                      :class="active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'"
                    >
                      Open report
                    </NuxtLink>
                  </MenuItem>

                  <MenuItem v-slot="{ active }">
                    <NuxtLink
                      :to="`/competition/video-timer/sessions/${session.id}/report?print=1`"
                      target="_blank"
                      class="flex w-full items-center rounded-lg px-3 py-2 text-sm"
                      :class="active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'"
                    >
                      Export PDF
                    </NuxtLink>
                  </MenuItem>

                  <div class="my-1 border-t border-gray-200" />

                  <MenuItem v-slot="{ active }">
                    <button
                      class="flex w-full items-center rounded-lg px-3 py-2 text-sm"
                      :class="active ? 'bg-red-50 text-red-700' : 'text-red-600'"
                      type="button"
                      :disabled="deleting"
                      @click="deleteSession"
                    >
                      {{ deleting ? "Deleting…" : "Delete session" }}
                    </button>
                  </MenuItem>
                </MenuItems>
              </transition>
            </Menu>
          </div>
        </div>

        <div v-if="deleteError" class="mt-4 text-sm text-red-600">
          {{ deleteError }}
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

                <div class="mt-1 text-xs text-gray-500">
                  Created at: {{ formatDate(session.createdAt) }}
                  <span> • {{ session.video.originalName }}</span>
                  <span> • {{ session.markers.length }} markers</span>
                </div>

                <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span class="text-gray-500">
                    Result date:
                    <span class="font-medium text-gray-700">{{ formatResultDate(session.resultDate) }}</span>
                  </span>

                  <span class="text-gray-500">
                    Result:
                    <span class="font-medium text-gray-700">{{ session.resultName || "No linked result" }}</span>
                  </span>

                  <button
                    class="font-medium text-blue-600 hover:text-blue-700"
                    type="button"
                    @click="openResultModal"
                  >
                    {{ session.resultLink?.resultSeq ? "Change result" : "Link result" }}
                  </button>
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

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Total breath count</div>
                      <div class="text-right text-gray-900 font-medium">{{ totalBreathCount ?? "-" }}</div>
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
                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Time per length</div>

                  <div class="mt-4">
                    <ClientOnly>
                      <div v-if="hasLapTimeChartData" class="h-[320px]">
                        <Line :data="lapTimeChartData" :options="lapTimeChartOptions" />
                      </div>

                      <div v-else class="text-sm text-gray-500">
                        No lap time data available.
                      </div>
                    </ClientOnly>
                  </div>
                </div>

                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Strokes and breaths by length</div>

                  <div class="mt-4">
                    <ClientOnly>
                      <div v-if="hasBreathTakenChartData" class="h-[320px]">
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

                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Strokes and breaths by distance</div>

                  <div class="mt-4">
                    <ClientOnly>
                      <div v-if="hasBreathMeterChartData" class="h-[320px]">
                        <Scatter :data="breathMeterChartData" :options="breathMeterChartOptions" />
                      </div>

                      <div v-else class="text-sm text-gray-500">
                        No breath marker distance data available.
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
                      <div class="text-gray-500">Result date</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatResultDate(session.resultDate) }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Result name</div>
                      <div class="text-right text-gray-900 font-medium">{{ session.resultName || "—" }}</div>
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
    <VideoTimerResultModal
      v-if="session"
      :open="resultModalOpen"
      :session-id="session.id"
      :swimmer-id="session.swimmer?.id ?? null"
      :course="session.selections.course"
      :stroke="session.selections.stroke"
      :distance="session.selections.distance"
      :current-result-link="session.resultLink ?? null"
      @close="closeResultModal"
      @saved="onResultSaved"
    />
  </div>
</template>
