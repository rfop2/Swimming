<script setup lang="ts">
  import { Bar } from "vue-chartjs"
  import {
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Tooltip,
    type ChartData,
    type ChartOptions,
    type TooltipItem,
  } from "chart.js"
  import type { VideoTimerBreathMarkerRecord, VideoTimerStrokeMarkerRecord } from "lib"

  type StrokeTrend = "faster" | "slower" | "steady"

  type StrokeInterval = {
    strokeNumber: number
    intervalMs: number
    differenceMs: number | null
    trend: StrokeTrend
    hasBreath: boolean
  }

  type LengthChart = {
    lengthIndex: number
    label: string
    strokeCount: number
    breathCount: number
    averageIntervalMs: number
    averageStrokeRate: number
    overallTrend: StrokeTrend
    intervals: StrokeInterval[]
    data: ChartData<"bar", number[], string>
  }

  const props = withDefaults( defineProps<{
    strokeMarkers: VideoTimerStrokeMarkerRecord[]
    breathMarkers?: VideoTimerBreathMarkerRecord[]
    showBreaths?: boolean
  }>(), {
    breathMarkers: () => [],
    showBreaths: true,
  } )

  ChartJS.register( BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend )

  const trendToleranceMs = 50

  const trendForDifference = ( differenceMs: number | null ): StrokeTrend => {
    if ( differenceMs === null || Math.abs( differenceMs ) < trendToleranceMs ) return "steady"
    return differenceMs < 0 ? "faster" : "slower"
  }

  const trendColor = ( trend: StrokeTrend ) => {
    if ( trend === "faster" ) return "#10b981"
    if ( trend === "slower" ) return "#ef4444"
    return "#64748b"
  }

  const lengthCharts = computed<LengthChart[]>( () => {
    const strokesByLength = new Map<number, VideoTimerStrokeMarkerRecord[]>()

    for ( const marker of props.strokeMarkers ) {
      const markers = strokesByLength.get( marker.lengthIndex ) ?? []
      markers.push( marker )
      strokesByLength.set( marker.lengthIndex, markers )
    }

    return [ ...strokesByLength.entries() ]
      .sort( ( [ a ], [ b ] ) => a - b )
      .map( ( [ lengthIndex, unsortedStrokes ] ) => {
        const strokes = [ ...unsortedStrokes ].sort( ( a, b ) => a.tMs - b.tMs )
        if ( strokes.length < 2 ) return null

        const breaths = props.showBreaths
          ? props.breathMarkers
            .filter( marker => marker.lengthIndex === lengthIndex )
            .sort( ( a, b ) => a.tMs - b.tMs )
          : []

        const breathStrokeIndexes = new Set<number>()

        for ( const breath of breaths ) {
          let nearestStrokeIndex = 0
          let nearestDistance = Number.POSITIVE_INFINITY

          strokes.forEach( ( stroke, index ) => {
            const distance = Math.abs( stroke.tMs - breath.tMs )
            if ( distance < nearestDistance ) {
              nearestDistance = distance
              nearestStrokeIndex = index
            }
          } )

          breathStrokeIndexes.add( Math.min( strokes.length - 1, Math.max( 1, nearestStrokeIndex ) ) )
        }

        const intervals: StrokeInterval[] = []

        for ( let index = 1; index < strokes.length; index++ ) {
          const current = strokes[index]!
          const previous = strokes[index - 1]!
          const intervalMs = Math.max( 0, current.tMs - previous.tMs )
          const previousInterval = intervals.at( -1 )?.intervalMs ?? null
          const differenceMs = previousInterval === null ? null : intervalMs - previousInterval

          intervals.push( {
            strokeNumber: index + 1,
            intervalMs,
            differenceMs,
            trend: trendForDifference( differenceMs ),
            hasBreath: breathStrokeIndexes.has( index ),
          } )
        }

        const averageIntervalMs = intervals.reduce( ( total, interval ) => total + interval.intervalMs, 0 ) / intervals.length
        const overallDifferenceMs = intervals.length > 1
          ? intervals.at( -1 )!.intervalMs - intervals[0]!.intervalMs
          : null
        const firstStroke = strokes[0]!
        const lastStroke = strokes.at( -1 )!

        const data: ChartData<"bar", number[], string> = {
          labels: intervals.map( interval => `S${interval.strokeNumber}${interval.hasBreath ? " · B" : ""}` ),
          datasets: [ {
            label: "Time between strokes",
            data: intervals.map( interval => interval.intervalMs / 1000 ),
            backgroundColor: intervals.map( interval => trendColor( interval.trend ) ),
            borderColor: intervals.map( interval => interval.hasBreath ? "#f59e0b" : trendColor( interval.trend ) ),
            borderWidth: intervals.map( interval => interval.hasBreath ? 3 : 0 ),
            borderRadius: 4,
            maxBarThickness: 72,
            categoryPercentage: 0.8,
            barPercentage: 0.75,
          } ],
        }

        return {
          lengthIndex,
          label: `${firstStroke.fromM} - ${lastStroke.toM} m`,
          strokeCount: strokes.length,
          breathCount: breaths.length,
          averageIntervalMs,
          averageStrokeRate: averageIntervalMs > 0 ? 60000 / averageIntervalMs : 0,
          overallTrend: trendForDifference( overallDifferenceMs ),
          intervals,
          data,
        }
      } )
      .filter( ( chart ): chart is LengthChart => chart !== null )
  } )

  const chartOptions = ( lengthChart: LengthChart ): ChartOptions<"bar"> => ( {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: items => {
            const interval = lengthChart.intervals[items[0]?.dataIndex ?? -1]
            return interval ? `Stroke ${interval.strokeNumber}` : "Stroke interval"
          },
          label: ( context: TooltipItem<"bar"> ) => {
            const interval = lengthChart.intervals[context.dataIndex]
            if ( !interval ) return ""
            const strokeRate = interval.intervalMs > 0
              ? `${( 60000 / interval.intervalMs ).toFixed( 1 )} strokes/min`
              : "stroke rate unavailable"
            return `Interval: ${( interval.intervalMs / 1000 ).toFixed( 2 )} s (${strokeRate})`
          },
          afterLabel: ( context: TooltipItem<"bar"> ) => {
            const interval = lengthChart.intervals[context.dataIndex]
            if ( !interval ) return ""

            const details: string[] = []
            if ( interval.differenceMs !== null ) {
              const direction = interval.trend === "faster" ? "faster" : interval.trend === "slower" ? "slower" : "similar"
              details.push( `${Math.abs( interval.differenceMs )} ms ${direction} than previous` )
            }
            if ( interval.hasBreath ) details.push( "Breath recorded" )
            return details
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Stroke number (B = breath)",
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Stroke interval (s)",
        },
        ticks: {
          callback: value => `${Number( value ).toFixed( 1 )}s`,
        },
      },
    },
  } )

  const trendLabel = ( trend: StrokeTrend ) => {
    if ( trend === "faster" ) return "Speeding up"
    if ( trend === "slower" ) return "Slowing down"
    return "Steady"
  }

  const trendTextClass = ( trend: StrokeTrend ) => {
    if ( trend === "faster" ) return "text-emerald-700"
    if ( trend === "slower" ) return "text-red-700"
    return "text-slate-600"
  }
</script>

<template>
  <div v-if="lengthCharts.length" class="space-y-4">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
      <span>Bar height = time between strokes. Lower means faster.</span>
      <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm bg-emerald-500" /> Speeding up</span>
      <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm bg-red-500" /> Slowing down</span>
      <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm bg-slate-500" /> Steady</span>
      <span v-if="showBreaths" class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm border-2 border-amber-500" /> Breath</span>
    </div>

    <div class="space-y-4">
      <div
        v-for="lengthChart in lengthCharts"
        :key="lengthChart.lengthIndex"
        class="break-inside-avoid rounded-lg border border-gray-200 p-3"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div class="text-sm font-semibold text-gray-900">
              Length {{ lengthChart.lengthIndex }} · {{ lengthChart.label }}
            </div>
            <div class="mt-1 text-xs text-gray-500">
              {{ lengthChart.strokeCount }} strokes · Average {{ (lengthChart.averageIntervalMs / 1000).toFixed(2) }}s · {{ lengthChart.averageStrokeRate.toFixed(1) }}/min
              <span v-if="showBreaths"> · {{ lengthChart.breathCount }} breaths</span>
            </div>
          </div>
          <div class="text-xs font-semibold" :class="trendTextClass(lengthChart.overallTrend)">
            {{ trendLabel(lengthChart.overallTrend) }}
          </div>
        </div>

        <div class="mt-3 h-56 w-full">
          <Bar :data="lengthChart.data" :options="chartOptions(lengthChart)" />
        </div>
      </div>
    </div>
  </div>

  <div v-else class="text-sm text-gray-500">
    At least two stroke markers in a length are required to show stroke tempo.
  </div>
</template>

<style scoped>
@media print {
  .break-inside-avoid {
    break-inside: avoid-page;
    page-break-inside: avoid;
  }
}
</style>
