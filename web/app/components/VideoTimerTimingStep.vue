<script setup lang="ts">
  import type { PropType } from "vue"
  import { toRaw } from "vue"

  const LABELS: Record<string, string> = {
    breakout_start: "Break out",
    breakout_after_turn: "Break out after turn",
    m10: "10m",
    before_turn_5: "5m before turn",
    hit_pad: "Hit pad",
    after_turn_10: "10m after turn",
    before_finish_5: "5m before finish",
    finish_time: "Finish time",
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

  type VideoTimerDraft = {
    finishVideoMs: number | null
    startOffsetMs: number | null
    surfaceSlots: MarkerSlot[]
    splitSlots: MarkerSlot[]
    selectedSlotId: string | null
    markers: Marker[]
    strokeCount: number | null
    count10to50: number | null
    count60to100: number | null
    reactionSec: number | null
    breakoutStartM: number | null
    turnRotationSec: number | null
    breakoutTurnM: number | null
  }

  const props = defineProps( {
    video: { type: Object as PropType<UploadedVideo>, required: true },
    selections: { type: Object as PropType<{ course: string; stroke: string; distance: string }>, required: true },
    swimmer: { type: Object as PropType<SwimmerRef>, required: false, default: null },
    meetId: { type: String, required: false, default: null },
    notes: { type: String, required: false, default: "" },
    initialOfficialFinishTime: { type: String, required: false, default: "" },
    resultLink: { type: Object as PropType<Record<string, string | null>>, required: true },
    draft: { type: Object as PropType<VideoTimerDraft>, required: true },
  } )

  const emit = defineEmits<{
    ( e: "back" ): void
    ( e: "stop", payload: { markers: Marker[] } ): void
    ( e: "update:draft", v: VideoTimerDraft ): void
  }>()

  const makeId = () => {
    const c = globalThis.crypto as Crypto | undefined
    if ( c?.randomUUID ) return c.randomUUID()
    return `${Date.now()}-${Math.random().toString( 16 ).slice( 2 )}`
  }

  
const cloneDraft = () => structuredClone( toRaw( props.draft ) ) as VideoTimerDraft

  const updateDraft = ( updater: ( next: VideoTimerDraft ) => void ) => {
    const next = cloneDraft()
    updater( next )
    emit( "update:draft", next )
  }

  const parseDistanceM = ( v: string ) => {
    const n = Number( String( v ).replace( /[^\d]/g, "" ) )
    return Number.isFinite( n ) ? n : 0
  }

  const normCourse = ( v: string ) => String( v || "" ).toLowerCase()
  const poolLenM = ( course: string ) => ( normCourse( course ) === "sc" ? 25 : 50 )

const buildSurfacePlanCodes = ( course: string, distance: string ) => {
  const c = normCourse( course )
  const d = parseDistanceM( distance )

  if ( d === 100 ) {
    return [ "breakout_start", "breakout_after_turn" ]
  }

  if ( c === "sc" ) return [ "breakout_start", "breakout_after_turn", "breakout_after_turn" ]
  return [ "breakout_start" ]
}

  const buildSplitPlanCodes = ( course: string, distance: string ) => {
    const d = parseDistanceM( distance )
    if ( !d ) return []

    const c = normCourse( course )

    if ( c === "lc" && d === 100 ) {
      return [
        "m10",
        "before_turn_5",
        "hit_pad",
        "after_turn_10",
        "before_finish_5",
        "finish_time",
        "finish",
      ]
    }

    const len = poolLenM( c )
    const turns = len > 0 ? Math.max( 0, Math.floor( d / len ) - 1 ) : 0

    const out: string[] = []
    out.push( "m10" )

    for ( let i = 0; i < turns; i++ ) {
      out.push( "before_turn_5" )
      out.push( "hit_pad" )
      out.push( "after_turn_10" )
    }

    out.push( "before_finish_5" )
    out.push( "finish_time" )
    out.push( "finish" )
    return out
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
    const surfaceCodes = buildSurfacePlanCodes( course, distance )
    const splitCodes = buildSplitPlanCodes( course, distance ).filter( c => c !== "finish" )
    return {
      surface: makeSlotsFromCodes( "surfacing", surfaceCodes ),
      split: makeSlotsFromCodes( "split", splitCodes ),
    }
  }

  const ensureDraftInitialized = () => {
    if ( props.draft.surfaceSlots.length || props.draft.splitSlots.length ) return

    const plans = buildMarkerPlans( props.selections.course, props.selections.distance )
    updateDraft( ( next ) => {
      next.surfaceSlots = plans.surface
      next.splitSlots = plans.split
      next.selectedSlotId = [ ...next.surfaceSlots, ...next.splitSlots ][0]?.id ?? null
    } )
  }

  ensureDraftInitialized()

  const allMarkerSlots = computed( () => [ ...props.draft.surfaceSlots, ...props.draft.splitSlots ] )

  const findSlotById = ( id: string | null ) => {
    if ( !id ) return null
    return allMarkerSlots.value.find( s => s.id === id ) ?? null
  }

  const selectedSlot = computed( () => findSlotById( props.draft.selectedSlotId ) )

  const nextSurfaceSlot = computed( () => props.draft.surfaceSlots.find( s => !s.missed && s.videoMs === null ) ?? null )
  const nextSplitSlot = computed( () => props.draft.splitSlots.find( s => s.code !== "finish_time" && !s.missed && s.videoMs === null ) ?? null )

  const isSurfacingSelected = computed( () => {
    if ( !selectedSlot.value ) return true
    return selectedSlot.value.type === "surfacing"
  } )

  const isSplitSelected = computed( () => {
    if ( !selectedSlot.value ) return false
    return selectedSlot.value.type === "split"
  } )

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

  const ZOOM_LEVELS = [ 1, 2, 4, 6, 8, 10, 12, 16, 20 ] as const
  const timelineZoom = ref<number>( 1 )
  const zoomIndex = computed( () => {
    const idx = ZOOM_LEVELS.findIndex( z => z === timelineZoom.value )
    return idx >= 0 ? idx : 0
  } )
  const canZoomOut = computed( () => zoomIndex.value > 0 )
  const canZoomIn = computed( () => zoomIndex.value < ZOOM_LEVELS.length - 1 )

  const zoomOut = () => {
    if ( !canZoomOut.value ) return
    timelineZoom.value = ZOOM_LEVELS[zoomIndex.value - 1]!
  }

  const zoomIn = () => {
    if ( !canZoomIn.value ) return
    timelineZoom.value = ZOOM_LEVELS[zoomIndex.value + 1]!
  }

  const timelineCenterMs = ref( 0 )
  const officialFinishText = ref( props.initialOfficialFinishTime || "" )
  const officialFinishMs = computed( () => parseOfficialTimeMs( officialFinishText.value ) )

  const dragging = ref<{ kind: "start" | "finish" | "marker"; id?: string } | null>( null )

  const finishVideoMs = computed( () => props.draft.finishVideoMs )
  const startOffsetMs = computed( () => props.draft.startOffsetMs )
  const hasFinishMarked = computed( () => finishVideoMs.value !== null )

  const setCurrentFromVideo = () => {
    const v = videoEl.value
    if ( !v ) return
    const t = Number.isFinite( v.currentTime ) ? v.currentTime : 0
    currentVideoMs.value = Math.max( 0, Math.round( t * 1000 ) )
    if ( !dragging.value ) timelineCenterMs.value = currentVideoMs.value
  }

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

  const toRaceMs = ( videoMs: number ) => {
    if ( props.draft.startOffsetMs === null ) return 0
    return videoMs - props.draft.startOffsetMs
  }

  const showFinishEditor = ref( false )

const recalculateStartFromCurrentFinish = () => {
  if ( props.draft.finishVideoMs === null || officialFinishMs.value === null ) return

  updateDraft( ( next ) => {
    next.startOffsetMs = next.finishVideoMs !== null
      ? next.finishVideoMs - officialFinishMs.value
      : null
  } )
}

const setFinishHereAndCloseEditor = () => {
  setFinishHere()
  showFinishEditor.value = false
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

  const markerPinClass = ( s: MarkerSlot ) => [
    s.type === "surfacing" ? "bg-cyan-500" : "bg-blue-500",
    s.id === props.draft.selectedSlotId ? "z-10 ring-2 ring-white ring-offset-1 ring-offset-gray-200" : ""
  ]

  const startPinMs = computed( () => props.draft.startOffsetMs )
  const finishPinMs = computed( () => props.draft.finishVideoMs )

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

  const setFinishHere = () => {
    if ( !isReady.value ) return
    const finish = currentVideoMs.value
    updateDraft( ( next ) => {
      next.finishVideoMs = finish
      next.startOffsetMs = officialFinishMs.value !== null ? finish - officialFinishMs.value : null
      const finishTimeSlot = next.splitSlots.find( s => s.code === "finish_time" ) ?? null
      if ( finishTimeSlot ) {
        finishTimeSlot.videoMs = finish
        finishTimeSlot.missed = false
      }
    } )
  }

  const clearMarker = ( id: string ) => {
    updateDraft( ( next ) => {
      const s = [ ...next.surfaceSlots, ...next.splitSlots ].find( x => x.id === id ) ?? null
      if ( !s ) return
      if ( s.code === "finish_time" ) return
      s.videoMs = null
      s.missed = false
    } )
  }

  const selectMarker = ( id: string ) => {
    updateDraft( ( next ) => {
      next.selectedSlotId = id
    } )
    const selected = findSlotById( id )
    if ( selected?.videoMs !== null ) {
      seekToMs( selected.videoMs )
    }
  }

  const placeMarkerAtCursor = ( type: MarkerType ) => {
    if ( !isReady.value ) return

    if ( type === "surfacing" ) {
      const next = nextSurfaceSlot.value
      if ( !next ) return
      updateDraft( ( draft ) => {
        const s = draft.surfaceSlots.find( x => x.id === next.id )
        if ( !s ) return
        s.videoMs = currentVideoMs.value
        s.missed = false
        draft.selectedSlotId = s.id
      } )
      return
    }

    const next = nextSplitSlot.value
    if ( !next ) return
    updateDraft( ( draft ) => {
      const s = draft.splitSlots.find( x => x.id === next.id )
      if ( !s ) return
      s.videoMs = currentVideoMs.value
      s.missed = false
      draft.selectedSlotId = s.id
    } )
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

    updateDraft( ( next ) => {
      if ( kind === "start" ) next.startOffsetMs = ms
      if ( kind === "finish" ) {
        next.finishVideoMs = ms
        const finishTimeSlot = next.splitSlots.find( s => s.code === "finish_time" ) ?? null
        if ( finishTimeSlot ) {
          finishTimeSlot.videoMs = ms
          finishTimeSlot.missed = false
        }
      }
      if ( kind === "marker" && id ) {
        const s = [ ...next.surfaceSlots, ...next.splitSlots ].find( x => x.id === id ) ?? null
        if ( s ) {
          s.videoMs = ms
          s.missed = false
          next.selectedSlotId = id
        }
      }
    } )

    seekToMs( ms )
  }

  const onPinPointerMove = ( e: PointerEvent ) => {
    if ( !dragging.value ) return
    const ms = msFromClientXVisible( e.clientX )
    const { kind, id } = dragging.value

    updateDraft( ( next ) => {
      if ( kind === "start" ) next.startOffsetMs = ms
      if ( kind === "finish" ) {
        next.finishVideoMs = ms
        const finishTimeSlot = next.splitSlots.find( s => s.code === "finish_time" ) ?? null
        if ( finishTimeSlot ) {
          finishTimeSlot.videoMs = ms
          finishTimeSlot.missed = false
        }
      }
      if ( kind === "marker" && id ) {
        const s = [ ...next.surfaceSlots, ...next.splitSlots ].find( x => x.id === id ) ?? null
        if ( s ) {
          s.videoMs = ms
          s.missed = false
        }
      }
    } )

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

  const allMarkersPlaced = computed( () =>
    allMarkerSlots.value
      .filter( s => s.code !== "finish_time" )
      .every( s => s.videoMs !== null )
  )

const canStop = computed( () =>
  isReady.value
  && props.draft.startOffsetMs !== null
  && props.draft.finishVideoMs !== null
  && allMarkersPlaced.value
  && props.draft.count10to50 !== null
  && props.draft.count10to50 > 0
  && props.draft.count60to100 !== null
  && props.draft.count60to100 > 0
)

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

    const v = videoEl.value
    if ( v ) v.pause()
    emit( "stop", { markers: out } )
  }

  const onBack = () => {
    const v = videoEl.value
    if ( v ) v.pause()
    emit( "back" )
  }

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
                  <div class="mt-4 flex items-center justify-between gap-4">
                    <div class="min-w-0 text-xs tabular-nums text-gray-500 truncate">
                      View: {{ formatVideoMsPrecise(visibleStartMs) }} → {{ formatVideoMsPrecise(visibleEndMs) }}
                    </div>

                    <div class="shrink-0 flex items-center gap-2">
                      <button
                        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        type="button"
                        :disabled="!canZoomOut"
                        @click="zoomOut"
                      >
                        −
                      </button>

                      <div class="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-gray-700">
                        x{{ timelineZoom }}
                      </div>

                      <button
                        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        type="button"
                        :disabled="!canZoomIn"
                        @click="zoomIn"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div class="mt-2 flex items-center justify-between gap-3 text-xs tabular-nums text-gray-500">
                    <div class="shrink-0 font-semibold text-gray-700 ml-auto">
                      Cursor: {{ formatVideoMsPrecise(currentVideoMs) }}
                    </div>
                  </div>

                  <div v-if="timelineTicks.length" class="relative mt-4 h-9 overflow-hidden rounded-md border border-gray-200 bg-white px-1">
                    <div
                      v-for="timelineTick in timelineTicks"
                      :key="`tick-${timelineTick.ms}`"
                      class="absolute top-0 bottom-0"
                      :style="{ left: `${pctFromVisibleMs(timelineTick.ms)}%` }"
                    >
                      <div class="w-px" :class="timelineTick.showLabel ? 'h-4 bg-gray-500' : 'h-2 bg-gray-300'" />
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
                      'relative mt-4 h-10 rounded-md overflow-hidden cursor-pointer select-none',
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

                  <div class="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-green-700" /> Start</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-red-700" /> Finish</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-cyan-600" /> Surfacing</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-blue-600" /> Split</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="w-full">
              <div class="text-sm font-semibold text-gray-800 mb-2">Controls</div>

              <div class="w-full rounded-xl border border-gray-200 bg-white p-4">
                <template v-if="!hasFinishMarked">
  <div class="mt-2">
    <div class="text-xs font-semibold text-gray-700 mb-2">
      Step 1: Find the exact finish moment
    </div>

    <div class="grid grid-cols-1 gap-3">
      <div>
        <label class="block text-xs font-semibold text-gray-700 mb-1">
          Official finish time
        </label>

        <input
          v-model="officialFinishText"
          type="text"
          placeholder="e.g. 1:14.58"
          class="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
        >

        <div class="mt-1 text-[11px] text-gray-500">
          Enter the official race time used to calculate race start.
        </div>

        <div
          v-if="officialFinishText.trim() && officialFinishMs === null"
          class="mt-1 text-[11px] text-red-600"
        >
          Invalid time format.
        </div>
      </div>

      <button
        class="h-10 px-3 rounded-md bg-red-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        type="button"
        :disabled="!isReady || officialFinishMs === null"
        @click="setFinishHere"
      >
        Set finish and calculate race start
      </button>
    </div>
  </div>
</template>

                <template v-else>
                  <div class="mb-3 flex items-center justify-between gap-3">
  <div class="text-xs font-semibold text-gray-700">
    Step 2: Place markers
  </div>

  <button
    class="text-xs font-semibold text-blue-600 hover:text-blue-700"
    type="button"
    @click="showFinishEditor = !showFinishEditor"
  >
    {{ showFinishEditor ? "Hide finish editor" : "Edit finish / start" }}
  </button>
</div>
<div
  v-if="showFinishEditor"
  class="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3"
>
  <div class="text-xs font-semibold text-gray-700 mb-2">
    Edit finish / race start
  </div>

  <div class="grid grid-cols-1 gap-3">
    <div>
      <label class="block text-xs font-semibold text-gray-700 mb-1">
        Official finish time
      </label>

      <input
        v-model="officialFinishText"
        type="text"
        placeholder="e.g. 1:14.58"
        class="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
      >

      <div
        v-if="officialFinishText.trim() && officialFinishMs === null"
        class="mt-1 text-[11px] text-red-600"
      >
        Invalid time format.
      </div>
    </div>

    <div class="grid grid-cols-1 gap-2">
  <button
    class="min-h-[40px] px-3 py-2 rounded-md bg-gray-900 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-normal leading-5"
    type="button"
    :disabled="props.draft.finishVideoMs === null || officialFinishMs === null"
    @click="recalculateStartFromCurrentFinish"
  >
    Recalculate start from current finish
  </button>

  <button
    class="min-h-[40px] px-3 py-2 rounded-md bg-red-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-normal leading-5"
    type="button"
    :disabled="!isReady || officialFinishMs === null"
    @click="setFinishHereAndCloseEditor"
  >
    Set finish here and recalculate
  </button>
</div>

    <div class="text-[11px] text-gray-600">
      Use the first button if only the official time changed. Use the second if you also want to move the finish marker to the current cursor position.
    </div>
  </div>
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
                        @click="placeMarkerAtCursor('surfacing')"
                      >
                        <span v-if="nextSurfaceSlot">Select next surfacing: {{ nextSurfaceSlot.label }}</span>
                        <span v-else>No pending surfacing markers</span>
                      </button>

                      <button
                        class="h-10 px-3 rounded-md text-left border disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                        :class="isSplitSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-300'"
                        type="button"
                        :disabled="!isReady || !nextSplitSlot"
                        @click="placeMarkerAtCursor('split')"
                      >
                        <span v-if="nextSplitSlot">Select next split: {{ nextSplitSlot.label }}</span>
                        <span v-else>No pending split markers</span>
                      </button>
                    </div>
                  </div>

                  <div class="mt-3 space-y-3">
                    <details class="border rounded-md bg-white" open>
                      <summary class="px-3 py-2 text-xs font-semibold bg-gray-50 cursor-pointer select-none">
                        Surfacing markers
                      </summary>

                      <div class="max-h-40 overflow-y-auto border-t">
                        <div
                          v-for="s in props.draft.surfaceSlots"
                          :key="s.id"
                          class="w-full px-3 py-2 text-xs border-b last:border-b-0 flex items-center justify-between gap-3"
                          :class="s.id === props.draft.selectedSlotId ? 'bg-cyan-50' : 'bg-white'"
                        >
                          <button
                            type="button"
                            class="flex-1 min-w-0 flex items-center justify-between text-left"
                            @click="selectMarker(s.id)"
                          >
                            <span class="font-semibold">{{ s.label }}</span>
                            <span class="tabular-nums text-gray-700">
                              <span v-if="s.videoMs !== null && props.draft.startOffsetMs !== null">{{ formatRaceMs(toRaceMs(s.videoMs)) }}</span>
                              <span v-else-if="s.videoMs !== null">{{ formatRaceMs(s.videoMs) }}</span>
                            </span>
                          </button>

                          <button
                            v-if="s.videoMs !== null"
                            type="button"
                            class="shrink-0 text-red-600 hover:text-red-700 font-semibold text-sm leading-none px-1"
                            @click.stop="clearMarker(s.id)"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </details>

                    <details class="border rounded-md bg-white" open>
                      <summary class="px-3 py-2 text-xs font-semibold bg-gray-50 cursor-pointer select-none">
                        Split markers
                      </summary>

                      <div class="max-h-56 overflow-y-auto border-t">
                        <div
                          v-for="s in props.draft.splitSlots"
                          :key="s.id"
                          class="w-full px-3 py-2 text-xs border-b last:border-b-0 flex items-center justify-between gap-3"
                          :class="s.id === props.draft.selectedSlotId ? 'bg-blue-50' : 'bg-white'"
                        >
                          <button
                            type="button"
                            class="flex-1 min-w-0 flex items-center justify-between text-left"
                            @click="selectMarker(s.id)"
                          >
                            <span class="font-semibold">{{ s.label }}</span>
                            <span class="tabular-nums text-gray-700">
                              <span v-if="s.videoMs !== null && props.draft.startOffsetMs !== null">{{ formatRaceMs(toRaceMs(s.videoMs)) }}</span>
                              <span v-else-if="s.videoMs !== null">{{ formatRaceMs(s.videoMs) }}</span>
                            </span>
                          </button>

                          <button
                            v-if="s.videoMs !== null && s.code !== 'finish_time'"
                            type="button"
                            class="shrink-0 text-red-600 hover:text-red-700 font-semibold text-sm leading-none px-1"
                            @click.stop="clearMarker(s.id)"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </details>
                  </div>

                  

                    <div class="mt-4 rounded-md border border-gray-200 bg-white p-3">
                    <div class="text-xs font-semibold text-gray-700 mb-2">Stroke counts</div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">Count 10 - 50m</label>
                        <input
                          :value="props.draft.count10to50 ?? ''"
                          class="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                          type="number"
                          min="1"
                          step="1"
                          inputmode="numeric"
                          @input="updateDraft((next) => { next.count10to50 = Number(($event.target as HTMLInputElement).value) || null })"
                        >
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">Count 60 - 100m</label>
                        <input
                          :value="props.draft.count60to100 ?? ''"
                          class="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                          type="number"
                          min="1"
                          step="1"
                          inputmode="numeric"
                          @input="updateDraft((next) => { next.count60to100 = Number(($event.target as HTMLInputElement).value) || null })"
                        >
                      </div>
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
                </template>
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