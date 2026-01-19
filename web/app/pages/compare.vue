<script setup lang="ts">
  import { Line } from "vue-chartjs"
  import type { ExtSwimmer, QualifyingRow } from "lib"
  import { COURSES, convertTime, secondsToTime, strokes, ucFirst } from "lib"

  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    type ChartData,
    type ChartDataset,
    type ChartOptions,
    type PointStyle,
    type ScriptableContext,
    type ScriptableLineSegmentContext,
    type TooltipItem,
  } from "chart.js"

  import "chartjs-adapter-date-fns"
  import annotationPlugin, { type AnnotationOptions } from "chartjs-plugin-annotation"
  import type { InternalApi } from "nitropack"
  import { FetchError } from "ofetch"


  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Compare Results",
    meta: [ { name: "description", content: "Compare multiple swimmers results on one chart" } ],
  } )

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

  type ResultsApiResponse = InternalApi["/api/results/:id"]["get"]
  type ResultRow = ResultsApiResponse[number]
  type QualifyingApiResponse = InternalApi["/api/qualifying/swimmer/:id"]["get"]
  interface ExtQualifyingRow extends QualifyingRow {
    courseTime: number
    periodKey: string
  }

  const courseOptions = Object.entries( COURSES ).map( ( [ k, v ] ) => ( { value: k, label: v } ) )
  const strokeOptions = Object.entries( strokes ).map( ( [ k, v ] ) => ( { value: k, label: v.label } ) )
  const distanceOptions = reactive<{ value: string; label: string }[]>(
    strokes[Object.keys( strokes )[0]].distances.map( ( d ) => ( { value: d, label: d } ) )
  )

  const { state: selections } = usePersisted( "compare-selection", {
    course: courseOptions[0].value,
    stroke: strokeOptions[0].value,
    distance: distanceOptions[0].value,
    period: {
      startDate: undefined as string | undefined,
      endDate: undefined as string | undefined,
      range: undefined as unknown,
    },
  }, "reactive" )

  watch(
    () => selections.stroke,
    ( newStroke ) => {
      distanceOptions.length = 0
      distanceOptions.push( ...strokes[newStroke].distances.map( ( d ) => ( { value: d, label: d } ) ) )
      if ( !distanceOptions.find( ( o ) => o.value === selections.distance ) ) selections.distance = distanceOptions[0].value
    }
  )

  type QualPeriod = {
    period?: {
      qualifyingActive?: boolean
      scope?: string
      type?: string
      [k: string]: unknown
    }
    times?: Array<{
      course: string
      stroke: string
      distance: string
      time: number
      [k: string]: unknown
    }>
  }

  const extractQual = ( qual: QualifyingApiResponse | undefined, scope: string, type?: string ) => {
    const periods = ( qual ?? [] ) as unknown as QualPeriod[]
    const qualifyingPeriods = periods.filter( ( v ) => v.period?.qualifyingActive )

    const period = qualifyingPeriods.find( ( v ) => {
      if ( v.period?.scope !== scope ) return false
      if ( type && v.period?.type !== type ) return false
      return true
    } )

    if ( !period ) return undefined

    const periodKey = JSON.stringify( {
      scope: period.period?.scope,
      type: period.period?.type,
      criteria: period.period,
    } )

    const row = ( period.times ?? [] )
      .map( ( q ) => ( {
        ...q,
        courseTime: convertTime( q.course, selections.course, selections.stroke, selections.distance, q.time ),
        periodKey,
      } ) )
      .find( ( t ) => t.stroke === selections.stroke && t.distance === selections.distance )

    return row as unknown as ExtQualifyingRow | undefined
  }

  const { state: selectedIds } = usePersisted<string[]>( "multi-swimmer", [], "state" )
  const { swimmers } = useSwimmers()
  const selectedLimitedIds = computed( () => {
    const list = Array.isArray( selectedIds.value ) ? selectedIds.value.map( ( v ) => String( v ) ) : []
    return Array.from( new Set( list ) ).slice( 0, 5 )
  } )

  const swimmerMap = computed( () => new Map( ( swimmers.value ?? [] ).map( ( s ) => [ String( s.id ), s ] ) ) )

  const selectedSwimmers = computed<ExtSwimmer[]>( () => {
    return selectedLimitedIds.value
      .map( ( id ) => swimmerMap.value.get( id ) )
      .filter( ( s ): s is ExtSwimmer => Boolean( s ) )
  } )


  const recordsBySwimmer = ref<Record<string, ResultsApiResponse>>( {} )
  const qualifyingBySwimmer = ref<Record<string, QualifyingApiResponse>>( {} )

  const buildQuery = () => {
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
    if ( selections.period.startDate ) query.startDate = selections.period.startDate
    if ( selections.period.endDate ) query.endDate = selections.period.endDate
    return query
  }

  const sortRecords = ( arr: ResultsApiResponse ) => {
    const copy = [ ...arr ]
    copy.sort( ( a: ResultRow, b: ResultRow ) => {
      if ( a.date < b.date ) return -1
      if ( a.date > b.date ) return 1
      if ( a.round < b.round ) return 1
      if ( a.round > b.round ) return -1
      return 0
    } )
    return copy
  }

  type Point = { x: string; y: number }


  watchEffect( async () => {
    if ( import.meta.server ) return

    const ids = selectedLimitedIds.value
    if ( !ids.length ) return

    const query = buildQuery()

    await Promise.all(
      ids.map( async ( id ) => {
        const rec = await $fetch<ResultsApiResponse>( `/api/results/${id}`, { query } )
        recordsBySwimmer.value[id] = sortRecords( rec )

        try {
          qualifyingBySwimmer.value[id] = await $fetch<QualifyingApiResponse>( `/api/qualifying/swimmer/${id}` )
        } catch ( error ) {
          if ( error instanceof FetchError && error.status === 404 ) qualifyingBySwimmer.value[id] = []
          else throw error
        }
      } )
    )
  } )

  const palette = [ "#60a5fa", "#f97316", "#22c55e", "#a855f7", "#ef4444" ]

  const datasets = computed<ChartDataset<"line", Point[]>[]>( () => {
    return selectedLimitedIds.value.map( ( id, i ) => {
      const recs = recordsBySwimmer.value[id] ?? []
      const swimmer = swimmerMap.value.get( id )

      const points: Point[] = recs
        .filter( ( r: ResultRow ) => r.time != null )
        .map( ( r: ResultRow ) => ( { x: String( r.date ), y: Number( r.time ) } ) )

      return {
        label: swimmer?.fullName ?? id,
        data: points,
        borderColor: palette[i % palette.length],
        borderWidth: 1.5,
        pointRadius: ( ctx: ScriptableContext<"line"> ) => {
          const parsedY = ctx.parsed?.y
          if ( typeof parsedY !== "number" ) return 0
          const data = ( ctx.dataset.data ?? [] ) as Point[]
          if ( !data.length ) return 2
          const minVal = Math.min( ...data.map( ( p ) => p.y ) )
          return parsedY === minVal ? 4 : 2
        },
        pointStyle: ( ctx: ScriptableContext<"line"> ): PointStyle => {
          const parsedY = ctx.parsed?.y
          if ( typeof parsedY !== "number" ) return "circle"
          const data = ( ctx.dataset.data ?? [] ) as Point[]
          if ( !data.length ) return "circle"
          const minVal = Math.min( ...data.map( ( p ) => p.y ) )
          return parsedY === minVal ? "rectRot" : "circle"
        },
        segment: {
          borderDash: ( ctx: ScriptableLineSegmentContext ) => {
            const p0 = ctx.p0?.parsed?.y
            const p1 = ctx.p1?.parsed?.y
            if ( typeof p0 !== "number" || typeof p1 !== "number" ) return []
            return p1 > p0 ? [ 6, 2 ] : []
          },
        },
      }
    } )
  } )



  const chartData = computed( (): ChartData<"line", Point[]> => ( {
    datasets: datasets.value,
  } ) )

 

  const sharedQualifyingTimes = computed<ExtQualifyingRow[]>( () => {
    const swimmers = selectedSwimmers.value
    if ( !swimmers.length ) return []

    const zones: Array<{ scope: string; type?: string }> = [
      { scope: "county" },
      { scope: "regional", type: "summer" },
      { scope: "regional", type: "winter" },
    ]

    const out: ExtQualifyingRow[] = []

    for ( const z of zones ) {
      const rows = swimmers.map( ( s ) => extractQual( qualifyingBySwimmer.value[String( s.id )], z.scope, z.type ) )

      if ( rows.some( ( r ) => !r ) ) continue

      const first = rows[0]!
      const sameKey = rows.every( ( r ) => r!.periodKey === first.periodKey )
      if ( !sameKey ) continue

      const sameTime = rows.every( ( r ) => Math.abs( r!.courseTime - first.courseTime ) < 0.001 )
      if ( !sameTime ) continue

      out.push( first )
    }

    return out.sort( ( a, b ) => a.courseTime - b.courseTime )
  } )

  const allTimesMin = computed( () => {
    const ys = datasets.value.flatMap( ( ds ) => {
      const data = ( ds.data ?? [] ) as Point[]
      return data.map( ( p ) => p.y )
    } )

    const minData = ys.length ? Math.min( ...ys ) : 0
    const minQual = sharedQualifyingTimes.value.length
      ? Math.min( ...sharedQualifyingTimes.value.map( ( q ) => q.courseTime ) )
      : minData

    return Math.min( minData, minQual )
  } )

  const yMin = computed( () => {
    const minValue = allTimesMin.value
    if ( !Number.isFinite( minValue ) ) return 0
    const padding = Math.max( 2, Math.min( 10, Math.floor( minValue * 0.05 ) ) )
    let scale = 1
    if ( minValue > 300 ) scale = 10
    else if ( minValue > 100 ) scale = 5
    else if ( minValue > 60 ) scale = 2
    return Math.floor( ( minValue - padding ) / scale ) * scale
  } )

  const boxColours: Record<string, { colour: string; background: string }> = {
    general: { colour: "#137c3a", background: "#22c55e30" },
    summer: { colour: "#b65e1f", background: "#f9741642" },
    winter: { colour: "#5e90be", background: "#3cadfd80" },
  }

  const boxes = computed<Record<string, AnnotationOptions>>( () => {
    return Object.fromEntries(
      sharedQualifyingTimes.value.map( ( time, i ) => {
        const boxKey = `zone${i + 1}`
        const bg = boxColours[time.type ?? "general"]?.background ?? "#e5e7eb55"
        const fg = boxColours[time.type ?? "general"]?.colour ?? "#111827"

        const zone: AnnotationOptions = {
          type: "box",
          yMin: i > 0 ? sharedQualifyingTimes.value[i - 1].courseTime : 0,
          yMax: time.courseTime,
          backgroundColor: bg,
          borderWidth: 0,
          drawTime: "beforeDatasetsDraw",
          label: {
            display: true,
            content: `${ucFirst( time.scope === "county" ? time.scope : time.type )}: ${secondsToTime( time.courseTime )}`,
            position: "start",
            backgroundColor: bg,
            color: fg,
            font: { size: 12, weight: "normal" },
            padding: { top: 4, right: 6, bottom: 4, left: 6, padding: 4, borderRadius: 4 },
          },
        }

        return [ boxKey, zone ]
      } )
    )
  } )
  const hasChartData = computed( () => datasets.value.some( ( d ) => d.data.length > 0 ) )

  const options = computed<ChartOptions<"line">>( () => ( {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time",
        time: { unit: "month", tooltipFormat: "MMM do, yyyy" },
        title: { display: true, text: "Date" },
      },
      y: {
        title: { display: true, text: "Time" },
        min: yMin.value,
        ticks: {
          callback: ( value ) => {
            const seconds = Number( value )
            const mins = Math.floor( seconds / 60 )
            const secs = Math.floor( seconds % 60 )
            const paddedSecs = secs.toString().padStart( 2, "0" )
            return mins > 0 ? `${mins}:${paddedSecs}` : seconds
          },
        },
      },
    },
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: ( context: TooltipItem<"line"> ) => {
            const label = context.dataset.label || ""

            const raw = context.raw
            const seconds =
              typeof raw === "number"
                ? raw
                : typeof raw === "object" && raw && "y" in raw
                  ? Number( ( raw as { y: unknown } ).y )
                  : Number( context.parsed?.y )

            if ( !Number.isFinite( seconds ) ) return `${label}: —`

            return `${label}: ${secondsToTime( seconds )}`
          },
        },
      },
      annotation: { annotations: boxes.value },
    },
  } ) )


 

  onMounted( () => {
    watch(
      swimmers,
      ( list ) => {
        if ( !selectedIds.value.length && ( list?.length ?? 0 ) > 0 ) selectedIds.value = [ String( list[0].id ) ]
      },
      { immediate: true }
    )
  } )
  type RankingRow = {
    id: string
    fullName: string
    pbTime?: number
    pbDate?: string
    lastTime?: number
    lastDate?: string
  }

  const rankingRows = computed<RankingRow[]>( () => {
    const rows = selectedLimitedIds.value.map( ( id ) => {
      const swimmer = swimmerMap.value.get( id )
      const recs = ( recordsBySwimmer.value[id] ?? [] ).filter( ( r ) => r.time != null )

      if ( !recs.length ) return { id, fullName: swimmer?.fullName ?? id }

      let pb = recs[0]
      for ( const r of recs ) if ( Number( r.time ) < Number( pb.time ) ) pb = r
      const last = recs[recs.length - 1]

      return {
        id,
        fullName: swimmer?.fullName ?? id,
        pbTime: Number( pb.time ),
        pbDate: String( pb.date ),
        lastTime: Number( last.time ),
        lastDate: String( last.date ),
      }
    } )

    return rows.sort( ( a, b ) => ( a.pbTime ?? Number.POSITIVE_INFINITY ) - ( b.pbTime ?? Number.POSITIVE_INFINITY ) )
  } )


</script>



<template>
  <StandardPage title="Compare Results">
    <template #description>
      Compare the times of up to five swimmers in the same event over time. Lower is better. The lowest point is each swimmer’s best time; points further to the right are more recent results.
    </template>

    <template #controls>
      <div class="min-w-[420px]">
        <MultiSwimmerSelector v-model="selectedIds" :max="5" />
      </div>

      <div class="min-w-24">
        <UI-Listbox v-model="selections.course" :options="courseOptions" label="Course" />
      </div>

      <div class="min-w-48">
        <UI-Listbox v-model="selections.stroke" :options="strokeOptions" label="Stroke" />
      </div>

      <div class="min-w-32">
        <UI-Listbox v-model="selections.distance" :options="distanceOptions" label="Distance" />
      </div>

      <div class="min-w-48">
        <UI-Year-Range v-model="selections.period" />
      </div>
    </template>
    <ClientOnly>
      <div v-if="datasets.length && hasChartData">
        <div class="overflow-x-auto">
          <div id="chart-container" class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <Line height="300" :data="chartData" :options="options" />
          </div>
        </div>
      </div>
      <div v-else>
        <p class="p-6 mx-4 text-md text-center border-2 border-solid border-gray-200 rounded-md">
          There are no results to display for the selected swimmers and event.
        </p>
      </div>
    </ClientOnly>
    

    
    <div class="mt-4 sm:px-6 lg:px-8">
      <div class="text-sm font-semibold text-gray-900">Summary</div>

      <div class="mt-2 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-left text-gray-600">
            <tr>
              <th class="py-2 pr-4">Swimmer</th>
              <th class="py-2 pr-4">PB</th>
              <th class="py-2 pr-4">PB Date</th>
              <th class="py-2 pr-4">Latest</th>
              <th class="py-2 pr-4">Latest Date</th>
            </tr>
          </thead>

          <tbody class="text-gray-900">
            <tr v-for="row in rankingRows" :key="row.id" class="border-t border-gray-200">
              <td class="py-2 pr-4 whitespace-nowrap">{{ row.fullName }}</td>
              <td class="py-2 pr-4 whitespace-nowrap">{{ row.pbTime != null ? secondsToTime(row.pbTime) : "—" }}</td>
              <td class="py-2 pr-4 whitespace-nowrap">{{ row.pbDate ?? "—" }}</td>
              <td class="py-2 pr-4 whitespace-nowrap">{{ row.lastTime != null ? secondsToTime(row.lastTime) : "—" }}</td>
              <td class="py-2 pr-4 whitespace-nowrap">{{ row.lastDate ?? "—" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </StandardPage>
</template>

<style scoped lang="scss">
#chart-container {
  height: 400px;
}
</style>
