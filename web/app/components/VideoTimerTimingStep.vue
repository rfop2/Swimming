<script setup lang="ts">
  import type { PropType } from "vue"

  type MarkerType = "split"

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
    distanceM: number
    label: string
    videoMs: number | null
    missed: boolean
  }

  const props = defineProps( {
    video: { type: Object as PropType<UploadedVideo>, required: true },
    selections: { type: Object as PropType<{ course: string; stroke: string; distance: string }>, required: true },
    swimmer: { type: Object as PropType<SwimmerRef>, required: false, default: null },
    notes: { type: String, required: false, default: "" },
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

  const formatRaceMs = ( ms: number ) => {
    const totalMs = Math.max( 0, Math.floor( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const m = Math.floor( totalSeconds / 60 )
    const ss = String( totalSeconds % 60 ).padStart( 2, "0" )
    const cs = String( Math.floor( ( totalMs % 1000 ) / 10 ) ).padStart( 2, "0" )
    return `${m}:${ss}.${cs}`
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

  const isReady = ref( false )
  const isPortrait = ref( false )

  const durationMs = ref<number>( props.video.durationMs ?? 0 )
  const currentVideoMs = ref( 0 )

  const finishVideoMs = ref<number | null>( null )
  const startOffsetMs = ref<number | null>( null )

  const officialFinishText = ref( "" )
  const officialFinishMs = computed( () => parseOfficialTimeMs( officialFinishText.value ) )

  const raceNowMs = computed( () => {
    if ( startOffsetMs.value === null ) return 0
    return Math.max( 0, currentVideoMs.value - startOffsetMs.value )
  } )

  const setCurrentFromVideo = () => {
    const v = videoEl.value
    if ( !v ) return
    const t = Number.isFinite( v.currentTime ) ? v.currentTime : 0
    currentVideoMs.value = Math.max( 0, Math.round( t * 1000 ) )
  }

  let raf = 0
  const tick = () => {
    setCurrentFromVideo()
    const v = videoEl.value
    if ( v && !v.paused ) raf = requestAnimationFrame( tick )
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

  const togglePlay = async () => {
    const v = videoEl.value
    if ( !v ) return
    try {
      if ( v.paused ) {
        await v.play()
        cancelAnimationFrame( raf )
        raf = requestAnimationFrame( tick )
      } else {
        v.pause()
        cancelAnimationFrame( raf )
      }
    } catch {
      return
    }
  }

  const seekToMs = ( ms: number ) => {
    const v = videoEl.value
    if ( !v ) return
    const d = durationMs.value || 0
    const clamped = d > 0 ? Math.max( 0, Math.min( d, ms ) ) : Math.max( 0, ms )
    v.currentTime = clamped / 1000
    currentVideoMs.value = clamped
  }

  const buildDistanceSlots = ( distanceStr: string ): MarkerSlot[] => {
    const d = parseDistanceM( distanceStr )
    if ( !d ) return []
    const out: MarkerSlot[] = []
    for ( let m = 15; m <= d; m += 5 ) {
      out.push( {
        id: makeId(),
        distanceM: m,
        label: `${m}m`,
        videoMs: null,
        missed: false,
      } )
    }
    return out
  }

  const markerSlots = ref<MarkerSlot[]>( buildDistanceSlots( props.selections.distance ) )
  const selectedSlotId = ref<string | null>( markerSlots.value[0]?.id ?? null )

  watch(
    () => props.selections.distance,
    ( v ) => {
      markerSlots.value = buildDistanceSlots( v )
      selectedSlotId.value = markerSlots.value[0]?.id ?? null
      finishVideoMs.value = null
      startOffsetMs.value = null
    }
  )

  const selectedSlot = computed( () => markerSlots.value.find( s => s.id === selectedSlotId.value ) ?? null )

  const setFinishHere = () => {
    if ( !isReady.value ) return
    finishVideoMs.value = currentVideoMs.value
  }

  const setStartHere = () => {
    if ( !isReady.value ) return
    startOffsetMs.value = currentVideoMs.value
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

  const markSelectedMissed = () => {
    const s = selectedSlot.value
    if ( !s ) return
    s.videoMs = null
    s.missed = true
  }

  const setNextMarkerHere = () => {
    if ( !isReady.value ) return
    const next = markerSlots.value.find( s => !s.missed && s.videoMs === null )
    if ( !next ) return
    selectedSlotId.value = next.id
    next.videoMs = currentVideoMs.value
    next.missed = false
  }

  const toRaceMs = ( videoMs: number ) => {
    if ( startOffsetMs.value === null ) return 0
    return videoMs - startOffsetMs.value
  }

  const startPinMs = computed( () => startOffsetMs.value )
  const finishPinMs = computed( () => finishVideoMs.value )

  const pctFromMs = ( ms: number ) => {
    const d = durationMs.value || 0
    if ( !d ) return 0
    return ( ms / d ) * 100
  }

  const msFromClientX = ( clientX: number ) => {
    const el = timelineEl.value
    const d = durationMs.value || 0
    if ( !el || !d ) return 0
    const r = el.getBoundingClientRect()
    const x = Math.max( 0, Math.min( r.width, clientX - r.left ) )
    return Math.round( ( x / r.width ) * d )
  }

  const dragging = ref<{ kind: "start" | "finish" | "marker"; id?: string } | null>( null )

  const onTimelinePointerDown = ( e: PointerEvent ) => {
    if ( !isReady.value ) return
    seekToMs( msFromClientX( e.clientX ) )
  }

  const onPinPointerDown = ( kind: "start" | "finish" | "marker", id: string | undefined, e: PointerEvent ) => {
    e.stopPropagation()
    if ( !isReady.value ) return
    dragging.value = { kind, id }
    ;( e.currentTarget as HTMLElement ).setPointerCapture( e.pointerId )
    const ms = msFromClientX( e.clientX )
    if ( kind === "start" ) startOffsetMs.value = ms
    if ( kind === "finish" ) finishVideoMs.value = ms
    if ( kind === "marker" && id ) {
      const s = markerSlots.value.find( x => x.id === id )
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
    const ms = msFromClientX( e.clientX )
    const { kind, id } = dragging.value

    if ( kind === "start" ) startOffsetMs.value = ms
    if ( kind === "finish" ) finishVideoMs.value = ms
    if ( kind === "marker" && id ) {
      const s = markerSlots.value.find( x => x.id === id )
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

    const el = e.currentTarget as HTMLElement | null
    if ( el && el.hasPointerCapture( e.pointerId ) ) {
      el.releasePointerCapture( e.pointerId )
    }
  }

  const canStop = computed( () => isReady.value && startOffsetMs.value !== null )

  const emitStop = () => {
    const out: Marker[] = []

    for ( const s of markerSlots.value ) {
      if ( s.videoMs === null ) continue
      out.push( {
        id: makeId(),
        type: "split",
        code: `m${s.distanceM}`,
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

  onBeforeUnmount( () => {
    cancelAnimationFrame( raf )
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
                  <div
                    ref="timelineEl"
                    class="relative mt-3 h-10 rounded-md bg-gray-200 overflow-hidden cursor-pointer select-none"
                    @pointerdown="onTimelinePointerDown"
                  >
                    <div class="absolute inset-y-0 w-0.5 bg-gray-700" :style="{ left: `${pctFromMs(currentVideoMs)}%` }" />

                    <div
                      v-if="startPinMs !== null && durationMs"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-3 rounded bg-green-700"
                      :style="{ left: `${pctFromMs(Math.max(0, startPinMs))}%` }"
                      @pointerdown="(e) => onPinPointerDown('start', undefined, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />

                    <div
                      v-if="finishPinMs !== null && durationMs"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-3 rounded bg-red-700"
                      :style="{ left: `${pctFromMs(Math.max(0, finishPinMs))}%` }"
                      @pointerdown="(e) => onPinPointerDown('finish', undefined, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />

                    <div
                      v-for="s in markerSlots"
                      v-show="s.videoMs !== null"
                      :key="s.id"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-2 rounded"
                      :class="s.id === selectedSlotId ? 'bg-blue-700' : 'bg-blue-500'"
                      :style="{ left: `${pctFromMs(Math.max(0, s.videoMs!))}%` }"
                      @pointerdown="(e) => onPinPointerDown('marker', s.id, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />
                  </div>

                  <div class="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-green-700" /> Start</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-red-700" /> Finish</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-blue-600" /> Marker</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="w-full">
              <div class="text-sm font-semibold text-gray-800 mb-2">Controls</div>

              <div class="w-full rounded-xl border border-gray-200 bg-white p-4">
                <div class="text-3xl font-semibold tabular-nums">
                  {{ formatRaceMs(raceNowMs) }}
                </div>
                <div class="mt-1 text-xs text-gray-500 tabular-nums">
                  Video: {{ formatRaceMs(currentVideoMs) }}
                  <span v-if="startOffsetMs !== null"> • Start video ms: {{ startOffsetMs }}</span>
                </div>

                <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    class="h-12 rounded-md bg-gray-200 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="!isReady"
                    @click="togglePlay"
                  >
                    Play / Pause
                  </button>

                  <button
                    class="h-12 rounded-md bg-red-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="!isReady"
                    @click="setFinishHere"
                  >
                    Set finish here
                  </button>

                  <button
                    class="h-12 rounded-md bg-green-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="!isReady"
                    @click="setStartHere"
                  >
                    Set start here
                  </button>
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
                    Auto start from finish
                  </button>
                </div>

                <div v-if="startWarn" class="mt-2 text-xs text-red-600">
                  {{ startWarn }}
                </div>

                <div class="mt-4 border-t pt-4">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-semibold text-gray-800">Markers</div>
                    <button
                      class="h-9 px-3 rounded-md bg-gray-200 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      type="button"
                      :disabled="!isReady || !markerSlots.length"
                      @click="setNextMarkerHere"
                    >
                      Set next here
                    </button>
                  </div>

                  <div class="mt-3 flex flex-wrap gap-2">
                    <button
                      class="h-9 px-3 rounded-md bg-blue-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      type="button"
                      :disabled="!isReady || !selectedSlot"
                      @click="setSelectedMarkerHere"
                    >
                      Set selected here
                    </button>

                    <button
                      class="h-9 px-3 rounded-md bg-gray-200 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      type="button"
                      :disabled="!selectedSlot"
                      @click="markSelectedMissed"
                    >
                      Mark missed
                    </button>
                  </div>

                  <div class="mt-3 max-h-64 overflow-y-auto border rounded-md">
                    <button
                      v-for="s in markerSlots"
                      :key="s.id"
                      type="button"
                      class="w-full px-3 py-2 text-xs border-b last:border-b-0 flex items-center justify-between text-left"
                      :class="s.id === selectedSlotId ? 'bg-gray-50' : 'bg-white'"
                      @click="selectedSlotId = s.id"
                    >
                      <span class="font-semibold">{{ s.label }}</span>
                      <span class="tabular-nums text-gray-700">
                        <span v-if="s.videoMs !== null && startOffsetMs !== null">{{ formatRaceMs(toRaceMs(s.videoMs)) }}</span>
                        <span v-else-if="s.missed" class="text-gray-400">missed</span>
                        <span v-else class="text-gray-400">—</span>
                      </span>
                    </button>
                  </div>

                  <div class="mt-2 text-xs text-gray-500">
                    Tip: click a row to select, then scrub video and press “Set selected here”, or drag pins on the timeline.
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