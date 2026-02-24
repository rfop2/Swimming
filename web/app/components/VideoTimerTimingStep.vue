as cores continuam mudando, esse primeira marker ta azul claro, quando eu clico nele com o cursor ele fica azul escuro

<script setup lang="ts">
  import type { PropType } from "vue"

  const LABELS: Record<string, string> = {
    breakout: "Break out",
    m10: "10m",
    turn_end_5: "5m (turn end)",
    hit_pad: "Hit pad",
    turn_end_10: "10m (turn end)",
    m5: "5m",
    finish_end_5: "5m (Finish end)",
    finish: "Finish",
  }

  type MarkerType = "surfacing" | "split"
  type NextActionKind = "surfacing" | "split" | null

  type Marker = {
    id: string
    type: MarkerType
    code: string
    label: string
    tMs: number
  }

  type UploadedVideo = {
    id?: string
    playbackUrl: string
    originalName: string
    mimeType: string
    size: number
    durationMs?: number
  }

  type SwimmerRef = Record<string, unknown> | null

  type MarkerSlot = {
    id: string
    type: MarkerType
    code: string
    label: string
    videoMs: number | null
    missed: boolean
  }

  const props = defineProps( {
    video: { type: Object as PropType<UploadedVideo>, required: true },
    selections: { type: Object as PropType<{ course: string; stroke: string; distance: string }>, required: true },
    swimmer: { type: Object as PropType<SwimmerRef>, required: false, default: null },
    notes: { type: String, required: false, default: "" },
    initialOfficialFinishTime: { type: String, required: false, default: "" },
  } )

  const emit = defineEmits<{
    ( e: "back" ): void
    ( e: "stop", payload: { markers: Marker[]; startOffsetMs: number | null } ): void
  }>()

  const makeId = () => {
    const c = globalThis.crypto as Crypto | undefined
    if ( c?.randomUUID ) return c.randomUUID()
    return `${Date.now()}-${Math.random().toString( 16 ).slice( 2 )}`
  }

  const parseDistanceM = ( v: string ) => {
    const n = Number( String( v ).replace( /[^\d]/g, "" ) )
    return Number.isFinite( n ) ? n : 0
  }

  const isSurfacingSelected = computed( () => {
    if ( !selectedSlot.value ) return true
    return selectedSlot.value.type === "surfacing"
  } )

  const isSplitSelected = computed( () => {
    if ( !selectedSlot.value ) return false
    return selectedSlot.value.type === "split"
  } )

  const normCourse = ( v: string ) => String( v || "" ).toLowerCase()

  const poolLenM = ( course: string ) => ( normCourse( course ) === "sc" ? 25 : 50 )

  const buildSurfacePlanCodes = ( course: string ) =>
    normCourse( course ) === "sc" ? [ "breakout", "breakout", "breakout" ] : [ "breakout" ]

  const buildSplitPlanCodes = ( course: string, distance: string ) => {
    const d = parseDistanceM( distance )
    if ( !d ) return []

    const c = normCourse( course )
    const len = poolLenM( c )
    const turns = len > 0 ? Math.max( 0, Math.floor( d / len ) - 1 ) : 0

    const out: string[] = []
    out.push( "m10" )

    for ( let i = 0; i < turns; i++ ) {
      out.push( "turn_end_5" )
      out.push( "hit_pad" )
      out.push( "turn_end_10" )
    }

    out.push( c === "lc" ? "finish_end_5" : "m5" )
    out.push( "finish" )
    return out
  }

  const formatRaceMs = ( ms: number ) => {
    const totalMs = Math.max( 0, Math.floor( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const m = Math.floor( totalSeconds / 60 )
    const ss = String( totalSeconds % 60 ).padStart( 2, "0" )
    const cs = String( Math.floor( ( totalMs % 1000 ) / 10 ) ).padStart( 2, "0" )
    return `${m}:${ss}.${cs}`
  }

  const formatVideoMsPrecise = ( ms: number ) => {
    const totalMs = Math.max( 0, Math.floor( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const m = Math.floor( totalSeconds / 60 )
    const ss = String( totalSeconds % 60 ).padStart( 2, "0" )
    const mmm = String( totalMs % 1000 ).padStart( 3, "0" )
    return `${m}:${ss}.${mmm}`
  }

  const parseOfficialTimeMs = ( raw: string ): number | null => {
    const s = String( raw || "" ).trim().replace( ",", "." )
    if ( !s ) return null
    const parts = s.split( ":" ).map( p => p.trim() ).filter( Boolean )
    if ( !parts.length ) return null

    const last = parts[parts.length - 1]!
    const sec = Number( last )
    if ( !Number.isFinite( sec ) ) return null

    let mins = 0
    let hrs = 0

    if ( parts.length === 2 ) {
      mins = Number( parts[0] )
      if ( !Number.isFinite( mins ) ) return null
    } else if ( parts.length === 3 ) {
      hrs = Number( parts[0] )
      mins = Number( parts[1] )
      if ( !Number.isFinite( hrs ) || !Number.isFinite( mins ) ) return null
    } else if ( parts.length > 3 ) {
      return null
    }

    const totalSeconds = ( hrs * 3600 ) + ( mins * 60 ) + sec
    if ( !( totalSeconds > 0 ) ) return null
    return Math.round( totalSeconds * 1000 )
  }

  const videoEl = ref<HTMLVideoElement | null>( null )
  const timelineEl = ref<HTMLDivElement | null>( null )

  const timelineWidthPx = ref( 0 )
  let timelineResizeObserver: ResizeObserver | null = null

  const syncTimelineWidth = () => {
    timelineWidthPx.value = Math.round( timelineEl.value?.clientWidth ?? 0 )
  }

  const isReady = ref( false )
  const isPortrait = ref( false )

  const durationMs = ref<number>( props.video.durationMs ?? 0 )
  const currentVideoMs = ref( 0 )
  const timelineZoom = ref( 1 )
  const timelineCenterMs = ref( 0 )

  const finishVideoMs = ref<number | null>( null )
  const startOffsetMs = ref<number | null>( null )
  const hasFinishMarked = computed( () => finishVideoMs.value !== null )

  const officialFinishText = ref( props.initialOfficialFinishTime || "" )
  const officialFinishMs = computed( () => parseOfficialTimeMs( officialFinishText.value ) )

  const dragging = ref<{ kind: "start" | "finish" | "marker"; id?: string } | null>( null )

  const setCurrentFromVideo = () => {
    const v = videoEl.value
    if ( !v ) return
    const t = Number.isFinite( v.currentTime ) ? v.currentTime : 0
    currentVideoMs.value = Math.max( 0, Math.round( t * 1000 ) )
    if ( !dragging.value ) timelineCenterMs.value = currentVideoMs.value
  }

  const raf = 0
 
  const onLoadedMetadata = () => {
    const v = videoEl.value
    if ( !v ) return

    isPortrait.value = v.videoHeight > v.videoWidth

    const d = Number.isFinite( v.duration ) ? Math.round( v.duration * 1000 ) : 0
    durationMs.value = d || props.video.durationMs || 0

    isReady.value = true
    setCurrentFromVideo()
  }

  const seekToMs = ( ms: number ) => {
    const v = videoEl.value
    if ( !v ) return
    const d = durationMs.value || 0
    const clamped = d > 0 ? Math.max( 0, Math.min( d, ms ) ) : Math.max( 0, ms )
    v.currentTime = clamped / 1000
    currentVideoMs.value = clamped
    if ( !dragging.value ) timelineCenterMs.value = clamped
  }

  const makeSlotsFromCodes = ( type: MarkerType, codes: string[] ): MarkerSlot[] =>
    codes.map( code => ( {
      id: makeId(),
      type,
      code,
      label: LABELS[code] ?? code,
      videoMs: null,
      missed: false,
    } ) )

  const buildMarkerPlans = ( course: string, distance: string ) => {
    const surfaceCodes = buildSurfacePlanCodes( course )
    const splitCodes = buildSplitPlanCodes( course, distance ).filter( c => c !== "finish" )
    return {
      surface: makeSlotsFromCodes( "surfacing", surfaceCodes ),
      split: makeSlotsFromCodes( "split", splitCodes ),
    }
  }

  const surfaceSlots = ref<MarkerSlot[]>( [] )
  const splitSlots = ref<MarkerSlot[]>( [] )

  const resetMarkerPlans = () => {
    const plans = buildMarkerPlans( props.selections.course, props.selections.distance )
    surfaceSlots.value = plans.surface
    splitSlots.value = plans.split
  }

  resetMarkerPlans()

  const allMarkerSlots = computed( () => [ ...surfaceSlots.value, ...splitSlots.value ] )

  const selectedSlotId = ref<string | null>( null )

  const ensureSelectedSlot = () => {
    if ( selectedSlotId.value && allMarkerSlots.value.some( s => s.id === selectedSlotId.value ) ) return
    selectedSlotId.value = allMarkerSlots.value[0]?.id ?? null
  }

  ensureSelectedSlot()

  watch(
    () => [ props.selections.course, props.selections.distance ],
    () => {
      resetMarkerPlans()
      finishVideoMs.value = null
      startOffsetMs.value = null
      ensureSelectedSlot()
    }
  )

  watch(
    () => props.initialOfficialFinishTime,
    ( v ) => {
      if ( !officialFinishText.value ) {
        officialFinishText.value = v || ""
      }
    },
    { immediate: true }
  )

  const findSlotById = ( id: string | null ) => {
    if ( !id ) return null
    return allMarkerSlots.value.find( s => s.id === id ) ?? null
  }

  const selectedSlot = computed( () => findSlotById( selectedSlotId.value ) )

  const nextSurfaceSlot = computed( () => surfaceSlots.value.find( s => !s.missed && s.videoMs === null ) ?? null )
  const nextSplitSlot = computed( () => splitSlots.value.find( s => !s.missed && s.videoMs === null ) ?? null )

  const primaryNextAction = computed<NextActionKind>( () => {
    if ( selectedSlot.value?.type === "surfacing" && nextSurfaceSlot.value ) return "surfacing"
    if ( selectedSlot.value?.type === "split" && nextSplitSlot.value ) return "split"
    if ( nextSurfaceSlot.value ) return "surfacing"
    if ( nextSplitSlot.value ) return "split"
    return null
  } )

  const secondaryNextAction = computed<NextActionKind>( () => {
    if ( primaryNextAction.value === "surfacing" && nextSplitSlot.value ) return "split"
    if ( primaryNextAction.value === "split" && nextSurfaceSlot.value ) return "surfacing"
    return null
  } )

  const setFinishHere = () => {
    if ( !isReady.value ) return
    finishVideoMs.value = currentVideoMs.value
  }


  const applyAutoStartFromFinish = () => {
    const finish = finishVideoMs.value
    const off = officialFinishMs.value
    if ( finish === null || off === null ) return
    startOffsetMs.value = finish - off
  }

  const setSelectedMarkerHere = () => {
    if ( !isReady.value ) return
    const s = selectedSlot.value
    if ( !s ) return
    s.videoMs = currentVideoMs.value
    s.missed = false
  }

  const clearSelectedMarker = () => {
    const s = selectedSlot.value
    if ( !s ) return
    s.videoMs = null
    s.missed = false
  }

  const setNextSurfaceHere = () => {
    if ( !isReady.value ) return
    const next = nextSurfaceSlot.value
    if ( !next ) return
    selectedSlotId.value = next.id
  }

  const setNextSplitHere = () => {
    if ( !isReady.value ) return
    const next = nextSplitSlot.value
    if ( !next ) return
    selectedSlotId.value = next.id
  }

  const markerPinClass = ( s: MarkerSlot ) => [
    s.type === "surfacing" ? "bg-cyan-500" : "bg-blue-500",
    s.id === selectedSlotId.value ? "z-10 ring-2 ring-white ring-offset-1 ring-offset-gray-200" : ""
  ]

  const toRaceMs = ( videoMs: number ) => {
    if ( startOffsetMs.value === null ) return 0
    return videoMs - startOffsetMs.value
  }

  const startPinMs = computed( () => startOffsetMs.value )
  const finishPinMs = computed( () => finishVideoMs.value )

  const visibleRangeMs = computed( () => {
    const d = durationMs.value || 0
    if ( !d ) return 0
    const base = Math.round( d / Math.max( 1, timelineZoom.value ) )
    return Math.max( 1, Math.min( d, Math.max( 500, base ) ) )
  } )

  const visibleStartMs = computed( () => {
    const d = durationMs.value || 0
    const range = visibleRangeMs.value || 0
    if ( !d || !range ) return 0
    if ( range >= d ) return 0
    const raw = timelineCenterMs.value - Math.round( range / 2 )
    return Math.max( 0, Math.min( d - range, raw ) )
  } )

  const visibleEndMs = computed( () => {
    const d = durationMs.value || 0
    if ( !d ) return 0
    return Math.min( d, visibleStartMs.value + visibleRangeMs.value )
  } )

  const isMsVisibleInTimeline = ( ms: number | null ) => {
    if ( ms === null ) return false
    return ms >= visibleStartMs.value && ms <= visibleEndMs.value
  }

  const pctFromVisibleMs = ( ms: number ) => {
    const range = visibleRangeMs.value || 0
    if ( !range ) return 0
    const pct = ( ( ms - visibleStartMs.value ) / range ) * 100
    return Math.max( 0, Math.min( 100, pct ) )
  }

  const msFromClientXVisible = ( clientX: number ) => {
    const el = timelineEl.value
    const range = visibleRangeMs.value || 0
    if ( !el || !range ) return 0

    const r = el.getBoundingClientRect()
    const x = Math.max( 0, Math.min( r.width, clientX - r.left ) )
    const pct = r.width > 0 ? ( x / r.width ) : 0
    return Math.round( visibleStartMs.value + ( pct * range ) )
  }

  const onTimelinePointerDown = ( e: PointerEvent ) => {
    if ( !isReady.value ) return
    seekToMs( msFromClientXVisible( e.clientX ) )
  }

  const onPinPointerDown = ( kind: "start" | "finish" | "marker", id: string | undefined, e: PointerEvent ) => {
    e.stopPropagation()
    if ( !isReady.value ) return
    dragging.value = { kind, id }
    ;( e.currentTarget as HTMLElement ).setPointerCapture( e.pointerId )
    const ms = msFromClientXVisible( e.clientX )
    if ( kind === "start" ) startOffsetMs.value = ms
    if ( kind === "finish" ) finishVideoMs.value = ms
    if ( kind === "marker" && id ) {
      const s = findSlotById( id )
      if ( s ) {
        s.videoMs = ms
        s.missed = false
        selectedSlotId.value = id
      }
    }
    seekToMs( ms )
  }

  const onPinPointerMove = ( e: PointerEvent ) => {
    if ( !dragging.value ) return
    const ms = msFromClientXVisible( e.clientX )
    const { kind, id } = dragging.value

    if ( kind === "start" ) startOffsetMs.value = ms
    if ( kind === "finish" ) finishVideoMs.value = ms
    if ( kind === "marker" && id ) {
      const s = findSlotById( id )
      if ( s ) {
        s.videoMs = ms
        s.missed = false
      }
    }
    seekToMs( ms )
  }

  const onPinPointerUp = ( e: PointerEvent ) => {
    if ( !dragging.value ) return
    dragging.value = null
    timelineCenterMs.value = currentVideoMs.value

    const el = e.currentTarget as HTMLElement | null
    if ( el && el.hasPointerCapture( e.pointerId ) ) {
      el.releasePointerCapture( e.pointerId )
    }
  }

  const canStop = computed( () => isReady.value && startOffsetMs.value !== null )

  const emitStop = () => {
    const out: Marker[] = []

    for ( const s of allMarkerSlots.value ) {
      if ( s.videoMs === null ) continue
      out.push( {
        id: makeId(),
        type: s.type,
        code: s.code,
        label: s.label,
        tMs: s.videoMs,
      } )
    }

    if ( finishVideoMs.value !== null ) {
      out.push( {
        id: makeId(),
        type: "split",
        code: "finish",
        label: "Finish",
        tMs: finishVideoMs.value,
      } )
    }

    const v = videoEl.value
    if ( v ) v.pause()
    cancelAnimationFrame( raf )

    emit( "stop", { markers: out, startOffsetMs: startOffsetMs.value } )
  }

  const onBack = () => {
    const v = videoEl.value
    if ( v ) v.pause()
    cancelAnimationFrame( raf )
    emit( "back" )
  }

  const startWarn = computed( () => {
    if ( finishVideoMs.value === null || officialFinishMs.value === null || startOffsetMs.value === null ) return null
    if ( startOffsetMs.value > finishVideoMs.value ) return "Start is after finish. Check finish pin / official time."
    return null
  } )

  onMounted( () => {
    syncTimelineWidth()

    if ( typeof window !== "undefined" ) {
      window.addEventListener( "resize", syncTimelineWidth )
    }

    if ( typeof ResizeObserver !== "undefined" && timelineEl.value ) {
      timelineResizeObserver = new ResizeObserver( () => syncTimelineWidth() )
      timelineResizeObserver.observe( timelineEl.value )
    }
  } )

  onBeforeUnmount( () => {
    cancelAnimationFrame( raf )

    if ( typeof window !== "undefined" ) {
      window.removeEventListener( "resize", syncTimelineWidth )
    }

    timelineResizeObserver?.disconnect()
  } )

  const formatTickLabel = ( ms: number ) => {
    if ( timelineZoom.value >= 8 ) return formatVideoMsPrecise( ms )

    const totalMs = Math.max( 0, Math.floor( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const m = Math.floor( totalSeconds / 60 )
    const ss = String( totalSeconds % 60 ).padStart( 2, "0" )
    return `${m}:${ss}`
  }

  const tickConfig = computed( () => {
    const r = visibleRangeMs.value || 0

    if ( r <= 1500 ) return { step: 100, labelEvery: 5 }
    if ( r <= 4000 ) return { step: 200, labelEvery: 5 }
    if ( r <= 10000 ) return { step: 500, labelEvery: 2 }
    if ( r <= 20000 ) return { step: 1000, labelEvery: 2 }
    if ( r <= 40000 ) return { step: 2000, labelEvery: 2 }
    return { step: 5000, labelEvery: 1 }
  } )

  const tickLabelMinGapPx = computed( () => timelineZoom.value >= 8 ? 84 : 56 )

  const timelineTicks = computed( () => {
    const start = visibleStartMs.value
    const end = visibleEndMs.value
    const step = tickConfig.value.step

    if ( step <= 0 || end <= start ) return [] as Array<{ ms: number; showLabel: boolean }>

    const width = Math.max( 1, timelineWidthPx.value )
    const range = Math.max( 1, end - start )
    const pxPerStep = ( width * step ) / range

    const dynamicLabelEvery = Math.max( 1, Math.ceil( tickLabelMinGapPx.value / Math.max( 1, pxPerStep ) ) )
    const labelEvery = Math.max( tickConfig.value.labelEvery, dynamicLabelEvery )

    const first = Math.ceil( start / step ) * step
    const out: Array<{ ms: number; showLabel: boolean }> = []

    let i = 0
    for ( let t = first; t <= end; t += step ) {
      out.push( { ms: t, showLabel: i % labelEvery === 0 } )
      i++
    }

    return out
  } )
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="flex flex-col items-center px-6 py-6">
        <div class="w-full max-w-5xl">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold text-gray-800">Timing mode</div>
            <button class="h-10 px-4 rounded-md bg-gray-200 text-gray-900" type="button" @click="onBack">
              Back
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div class="w-full">
              <div class="text-sm font-semibold text-gray-800 mb-2">Video</div>

              <div class="w-full rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
                <div class="p-3 text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                  <div><span class="font-semibold">Course:</span> {{ props.selections.course }}</div>
                  <div><span class="font-semibold">Stroke:</span> {{ props.selections.stroke }}</div>
                  <div><span class="font-semibold">Distance:</span> {{ props.selections.distance }}</div>
                </div>

                <div
                  class="bg-black flex items-center justify-center overflow-hidden"
                  :class="isPortrait ? 'h-[75vh] max-h-[720px]' : 'aspect-video max-h-[520px]'"
                >
                  <video
                    ref="videoEl"
                    preload="auto"
                    :src="props.video.playbackUrl"
                    controls
                    playsinline
                    class="object-contain max-w-full max-h-full"
                    :class="isPortrait ? 'h-full w-auto' : 'w-full h-full'"
                    @loadedmetadata="onLoadedMetadata"
                    @timeupdate="setCurrentFromVideo"
                    @seeked="setCurrentFromVideo"
                  />
                </div>

                <div class="px-3 pb-3">
                  <div class="mt-2 flex items-center gap-3">
                    <label class="text-xs font-semibold text-gray-700">Timeline zoom</label>

                    <input
                      v-model.number="timelineZoom"
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      class="flex-1"
                    >

                    <div class="w-12 text-right text-xs tabular-nums text-gray-600">
                      x{{ timelineZoom }}
                    </div>
                  </div>

                  <div class="mt-1 flex items-center justify-between gap-3 text-xs tabular-nums text-gray-500">
                    <div class="truncate">
                      View: {{ formatVideoMsPrecise(visibleStartMs) }} → {{ formatVideoMsPrecise(visibleEndMs) }}
                    </div>

                    <div class="shrink-0 font-semibold text-gray-700">
                      Cursor: {{ formatVideoMsPrecise(currentVideoMs) }}
                    </div>
                  </div>

                  <div v-if="timelineTicks.length" class="relative mt-2 h-9 overflow-hidden rounded-md border border-gray-200 bg-white px-1">
                    <div
                      v-for="timelineTick in timelineTicks"
                      :key="`tick-${timelineTick.ms}`"
                      class="absolute top-0 bottom-0"
                      :style="{ left: `${pctFromVisibleMs(timelineTick.ms)}%` }"
                    >
                      <div
                        class="w-px"
                        :class="timelineTick.showLabel ? 'h-4 bg-gray-500' : 'h-2 bg-gray-300'"
                      />

                      <div
                        v-if="timelineTick.showLabel"
                        class="mt-0.5 -translate-x-1/2 text-xs font-medium tabular-nums text-gray-700 whitespace-nowrap bg-white/90 px-1 rounded"
                      >
                        {{ formatTickLabel(timelineTick.ms) }}
                      </div>
                    </div>
                  </div>

                  <div
                    ref="timelineEl"
                    :class="[
                      'relative mt-2 h-10 rounded-md overflow-hidden cursor-pointer select-none',
                      !hasFinishMarked ? 'bg-amber-100 ring-2 ring-amber-300' : 'bg-gray-200'
                    ]"
                    @pointerdown="onTimelinePointerDown"
                  >
                    <div class="absolute inset-y-0 w-0.5 bg-gray-700" :style="{ left: `${pctFromVisibleMs(currentVideoMs)}%` }" />

                    <div
                      v-if="startPinMs !== null && durationMs && isMsVisibleInTimeline(startPinMs)"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-3 rounded bg-green-700"
                      :style="{ left: `${pctFromVisibleMs(startPinMs)}%` }"
                      @pointerdown="(e) => onPinPointerDown('start', undefined, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />

                    <div
                      v-if="finishPinMs !== null && durationMs && isMsVisibleInTimeline(finishPinMs)"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-3 rounded bg-red-700"
                      :style="{ left: `${pctFromVisibleMs(finishPinMs)}%` }"
                      @pointerdown="(e) => onPinPointerDown('finish', undefined, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />

                    <div
                      v-for="s in allMarkerSlots"
                      v-show="s.videoMs !== null && isMsVisibleInTimeline(s.videoMs)"
                      :key="s.id"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-2 rounded transition-shadow"
                      :class="markerPinClass(s)"
                      :style="{ left: `${pctFromVisibleMs(s.videoMs!)}%` }"
                      @pointerdown="(e) => onPinPointerDown('marker', s.id, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />
                  </div>

                  <div class="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-green-700" /> Start</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-red-700" /> Finish</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-cyan-600" /> Surfacing</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-blue-600" /> Split</div>
                    <div v-if="!hasFinishMarked" class="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Step 1: Scrub the video/timeline to the exact wall touch moment, then click “Set finish at current video position”.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="w-full">
              <div class="text-sm font-semibold text-gray-800 mb-2">Controls</div>

              <div class="w-full rounded-xl border border-gray-200 bg-white p-4">
                <div class="mt-4">
                  <div class="text-xs font-semibold text-gray-700 mb-2">
                    Step 1: Find the exact finish moment
                  </div>

                  <div class="grid grid-cols-1 gap-2">
                    <button
                      class="h-10 px-3 rounded-md bg-red-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      type="button"
                      :disabled="!isReady"
                      @click="setFinishHere"
                    >
                      Set finish at current video position
                    </button>

                    <div v-if="hasFinishMarked" class="text-xs text-green-700">
                      Finish marked at video time {{ formatRaceMs(finishVideoMs!) }}.
                      You can still fine-tune it by dragging the red pin on the timeline.
                    </div>
                  </div>
                </div>

                <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div class="sm:col-span-2">
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Official finish time</label>
                    <input
                      v-model="officialFinishText"
                      class="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                      placeholder="e.g. 1:54.75"
                      inputmode="decimal"
                    >
                  </div>

                  <button
                    class="h-10 rounded-md bg-gray-900 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="finishVideoMs === null || officialFinishMs === null"
                    @click="applyAutoStartFromFinish"
                  >
                    Calculate race start
                  </button>
                </div>

                <div v-if="startWarn" class="mt-2 text-xs text-red-600">
                  {{ startWarn }}
                </div>

                <div class="mt-4 border-t pt-4">
                  <template v-if="hasFinishMarked && startOffsetMs !== null">
                    <div class="text-xs font-semibold text-gray-700 mb-3">
                      Step 2: Place markers
                    </div>

                    <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-xs font-semibold text-gray-700">Current action</div>
                        <div class="text-[11px] font-medium text-gray-500 text-right">
                          <span v-if="primaryNextAction === 'surfacing' && nextSurfaceSlot">
                            Next: Surfacing ({{ nextSurfaceSlot.label }})
                          </span>
                          <span v-else-if="primaryNextAction === 'split' && nextSplitSlot">
                            Next: Split ({{ nextSplitSlot.label }})
                          </span>
                          <span v-else>
                            No pending markers
                          </span>
                          <span
                            v-if="secondaryNextAction === 'surfacing' && nextSurfaceSlot"
                            class="block text-gray-400"
                          >
                            Alt: Surfacing ({{ nextSurfaceSlot.label }})
                          </span>
                          <span
                            v-else-if="secondaryNextAction === 'split' && nextSplitSlot"
                            class="block text-gray-400"
                          >
                            Alt: Split ({{ nextSplitSlot.label }})
                          </span>
                        </div>
                      </div>

                      <div class="mt-2 grid grid-cols-1 gap-2">
                        <button
                          class="h-10 px-3 rounded-md text-left border disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                          :class="isSurfacingSelected ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-cyan-700 border-cyan-300'"
                          type="button"
                          :disabled="!isReady || !nextSurfaceSlot"
                          @click="setNextSurfaceHere"
                        >
                          <span v-if="nextSurfaceSlot">Select next surfacing: {{ nextSurfaceSlot.label }}</span>
                          <span v-else>No pending surfacing markers</span>
                        </button>

                        <button
                          class="h-10 px-3 rounded-md text-left border disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                          :class="isSplitSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-300'"
                          type="button"
                          :disabled="!isReady || !nextSplitSlot"
                          @click="setNextSplitHere"
                        >
                          <span v-if="nextSplitSlot">Select next split: {{ nextSplitSlot.label }}</span>
                          <span v-else>No pending split markers</span>
                        </button>
                      </div>
                    </div>

                    <div class="mt-3 rounded-md border border-gray-200 bg-white">
                      <div class="px-3 py-2 border-b bg-gray-50 flex items-center justify-between gap-3">
                        <div class="text-xs font-semibold text-gray-700">Manual correction</div>
                        <div class="text-[11px] text-gray-500 truncate">
                          <span v-if="selectedSlot">
                            {{ selectedSlot.type === "surfacing" ? "Surfacing" : "Split" }} · {{ selectedSlot.label }}
                          </span>
                          <span v-else>No marker selected</span>
                        </div>
                      </div>

                      <div class="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          class="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-800 text-xs font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          type="button"
                          :disabled="!isReady || !selectedSlot"
                          @click="setSelectedMarkerHere"
                        >
                          Set selected at cursor
                        </button>

                        <button
                          class="h-9 px-3 rounded-md border border-gray-300 bg-gray-50 text-gray-800 text-xs font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          type="button"
                          :disabled="!selectedSlot"
                          @click="clearSelectedMarker"
                        >
                          Clear selected
                        </button>
                      </div>
                    </div>

                    <div class="mt-3 space-y-3">
                      <details class="border rounded-md bg-white" open>
                        <summary class="px-3 py-2 text-xs font-semibold bg-gray-50 cursor-pointer select-none">
                          Surfacing markers
                        </summary>

                        <div class="max-h-40 overflow-y-auto border-t">
                          <button
                            v-for="s in surfaceSlots"
                            :key="s.id"
                            type="button"
                            class="w-full px-3 py-2 text-xs border-b last:border-b-0 flex items-center justify-between text-left"
                            :class="s.id === selectedSlotId ? 'bg-cyan-50' : 'bg-white'"
                            @click="selectedSlotId = s.id"
                          >
                            <span class="font-semibold">{{ s.label }}</span>
                            <span class="tabular-nums text-gray-700">
                              <span v-if="s.videoMs !== null && startOffsetMs !== null">{{ formatRaceMs(toRaceMs(s.videoMs)) }}</span>
                              <span v-else-if="s.videoMs !== null">{{ formatRaceMs(s.videoMs) }}</span>
                              <span v-else-if="s.missed" class="text-gray-400">missed</span>
                              <span v-else class="text-gray-400">—</span>
                            </span>
                          </button>
                        </div>
                      </details>

                      <details class="border rounded-md bg-white" open>
                        <summary class="px-3 py-2 text-xs font-semibold bg-gray-50 cursor-pointer select-none">
                          Split markers
                        </summary>

                        <div class="max-h-56 overflow-y-auto border-t">
                          <button
                            v-for="s in splitSlots"
                            :key="s.id"
                            type="button"
                            class="w-full px-3 py-2 text-xs border-b last:border-b-0 flex items-center justify-between text-left"
                            :class="s.id === selectedSlotId ? 'bg-blue-50' : 'bg-white'"
                            @click="selectedSlotId = s.id"
                          >
                            <span class="font-semibold">{{ s.label }}</span>
                            <span class="tabular-nums text-gray-700">
                              <span v-if="s.videoMs !== null && startOffsetMs !== null">{{ formatRaceMs(toRaceMs(s.videoMs)) }}</span>
                              <span v-else-if="s.videoMs !== null">{{ formatRaceMs(s.videoMs) }}</span>
                              <span v-else-if="s.missed" class="text-gray-400">missed</span>
                              <span v-else class="text-gray-400">—</span>
                            </span>
                          </button>
                        </div>
                      </details>
                    </div>

                    <div class="mt-2 text-xs text-gray-500">
                      Use “Select next ...” to choose the marker, then click “Set selected at cursor” to place it.
                    </div>
                  </template>

                  <div v-else class="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-xs text-gray-600">
                    Mark the finish first to unlock marker controls.
                  </div>
                </div>

                <button
                  class="mt-4 w-full h-12 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  type="button"
                  :disabled="!canStop"
                  @click="emitStop"
                >
                  Save &amp; continue
                </button>

                <div class="mt-2 text-xs text-gray-500">
                  You can calibrate start from finish + official time, then place markers by scrubbing. Pins are draggable.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t bg-white px-6 py-4">
      <div class="w-full max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div class="text-xs text-gray-600 truncate">
          Video: <span class="font-semibold">{{ props.video.originalName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>