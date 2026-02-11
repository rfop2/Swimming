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

  const videoEl = ref<HTMLVideoElement | null>( null )
  const isReady = ref( false )

  const isRunning = ref( false )
  const startOffsetMs = ref<number | null>( null )

  

  const markers = ref<Marker[]>( [] )

  const normCourse = ( v: string ) => String( v || "" ).toLowerCase()

  const parseDistanceM = ( v: string ) => {
    const n = Number( String( v ).replace( /[^\d]/g, "" ) )
    return Number.isFinite( n ) ? n : 0
  }

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

  const surfacePlan = computed( () => buildSurfacePlanCodes( props.selections.course ) )
  const splitPlan = computed( () => buildSplitPlanCodes( props.selections.course, props.selections.distance ) )

  const surfaceCount = computed( () => markers.value.filter( m => m.type === "surfacing" ).length )
  const splitCount = computed( () => markers.value.filter( m => m.type === "split" ).length )

  const nextSurfaceCode = computed( () => surfacePlan.value[surfaceCount.value] ?? null )
  const nextSplitCode = computed( () => splitPlan.value[splitCount.value] ?? null )

  const nextSurface = computed( () => {
    const code = nextSurfaceCode.value
    if ( !code ) return null
    const label = LABELS[code]
    if ( !label ) return null
    return { code, label }
  } )

  const nextSplit = computed( () => {
    const code = nextSplitCode.value
    if ( !code ) return null
    const label = LABELS[code]
    if ( !label ) return null
    return { code, label }
  } )

  const makeId = () => {
    const c = globalThis.crypto as Crypto | undefined
    if ( c?.randomUUID ) return c.randomUUID()
    return `${Date.now()}-${Math.random().toString( 16 ).slice( 2 )}`
  }

  const readVideoMs = () => {
    const v = videoEl.value
    if ( !v ) return 0
    const t = Number.isFinite( v.currentTime ) ? v.currentTime : 0
    return Math.max( 0, Math.round( t * 1000 ) )
  }

  const toRaceMs = ( videoMs: number ) => {
    const s = startOffsetMs.value
    if ( s === null ) return 0
    return Math.max( 0, videoMs - s )
  }

  const nowMs = ref( 0 )
  let raf = 0

  const tick = () => {
    nowMs.value = toRaceMs( readVideoMs() )
    if ( isRunning.value ) raf = requestAnimationFrame( tick )
  }

  const isPortrait = ref( false )

  const onLoadedMetadata = () => {
    const v = videoEl.value
    if ( v ) isPortrait.value = v.videoHeight > v.videoWidth
    isReady.value = true
    nowMs.value = toRaceMs( readVideoMs() )
  }

  const togglePlay = async () => {
    const v = videoEl.value
    if ( !v ) return
    try {
      if ( v.paused ) await v.play()
      else v.pause()
    } catch {
      return
    }
  }

  const onStartTiming = () => {
    if ( !isReady.value ) return
    startOffsetMs.value = readVideoMs()
    markers.value = []
    nowMs.value = 0
    isRunning.value = true
    cancelAnimationFrame( raf )
    raf = requestAnimationFrame( tick )
  }

  const addMarker = ( type: MarkerType, next: { code: string; label: string } | null ) => {
    if ( !isRunning.value ) return
    if ( !next ) return
    const tMs = readVideoMs()
    markers.value.push( { id: makeId(), type, code: next.code, label: next.label, tMs } )
  }

  const onSurface = () => addMarker( "surfacing", nextSurface.value )
  const onSplit = () => addMarker( "split", nextSplit.value )

  const onStop = () => {
    const v = videoEl.value
    if ( v ) v.pause()
    isRunning.value = false
    cancelAnimationFrame( raf )
    emit( "stop", { markers: markers.value.slice(), startOffsetMs: startOffsetMs.value } )
  }

  const onBack = () => {
    const v = videoEl.value
    if ( v ) v.pause()
    isRunning.value = false
    cancelAnimationFrame( raf )
    emit( "back" )
  }

  const formatMs = ( ms: number ) => {
    const totalMs = Math.max( 0, Math.floor( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const m = Math.floor( totalSeconds / 60 )
    const ss = String( totalSeconds % 60 ).padStart( 2, "0" )
    const t = Math.floor( ( totalMs % 1000 ) / 100 )
    return `${m}:${ss}.${t}`
  }

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
                    :src="props.video.playbackUrl"
                    controls
                    playsinline
                    class="object-contain max-w-full max-h-full"
                    :class="isPortrait ? 'h-full w-auto' : 'w-full h-full'"
                    @loadedmetadata="onLoadedMetadata"
                  />
                </div>
              </div>
            </div>

            <div class="w-full">
              <div class="text-sm font-semibold text-gray-800 mb-2">Controls</div>

              <div class="w-full rounded-xl border border-gray-200 bg-white p-4">
                <div class="text-3xl font-semibold tabular-nums">
                  {{ formatMs(nowMs) }}
                </div>

                <div class="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <button
                    class="h-12 rounded-md bg-gray-200 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="!isReady"
                    @click="togglePlay"
                  >
                    Play / Pause
                  </button>

                  <button
                    class="h-12 rounded-md bg-green-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="!isReady || isRunning"
                    @click="onStartTiming"
                  >
                    Start timing
                  </button>

                  <button
                    class="h-12 rounded-md bg-gray-900 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="!isRunning || !nextSurface"
                    @click="onSurface"
                  >
                    {{ nextSurface?.label ?? "Surfacing" }}
                  </button>

                  <button
                    class="h-12 rounded-md bg-gray-900 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="!isRunning || !nextSplit"
                    @click="onSplit"
                  >
                    {{ nextSplit ? `Split: ${nextSplit.label}` : "Split" }}
                  </button>
                </div>

                <button
                  class="mt-3 w-full h-12 rounded-md bg-red-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  type="button"
                  :disabled="!isRunning"
                  @click="onStop"
                >
                  STOP
                </button>

                <div class="mt-4 text-xs text-gray-600">
                  Markers: <span class="font-semibold">{{ markers.length }}</span>
                </div>

                <div v-if="markers.length" class="mt-2 max-h-48 overflow-y-auto border rounded-md">
                  <div
                    v-for="m in markers"
                    :key="m.id"
                    class="px-3 py-2 text-xs border-b last:border-b-0 flex items-center justify-between"
                  >
                    <span class="font-semibold">{{ m.label ?? m.type }}</span>
                    <span class="tabular-nums">{{ formatMs(toRaceMs(m.tMs)) }}</span>
                  </div>
                </div>
              </div>

              <div class="mt-2 text-xs text-gray-500">
                Play the video, then click “Start timing” at the real race start. Markers capture the video timestamp; the UI shows race time (relative).
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
