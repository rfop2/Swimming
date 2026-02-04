<!-- app/components/VideoTimerTimingStep.vue -->
<script setup lang="ts">
  import type { PropType } from "vue"

  type MarkerType = "surfacing" | "split"

  type Marker = {
    id: string
    type: MarkerType
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
    ( e: "stop", payload: { markers: Marker[] } ): void
  }>()

  

  const videoEl = ref<HTMLVideoElement | null>( null )
  const isRunning = ref( false )
  const isReady = ref( false )
  const markers = ref<Marker[]>( [] )
  const nowMs = ref( 0 )
  let raf = 0

  const makeId = () => {
    const c = globalThis.crypto as Crypto | undefined
    if ( c?.randomUUID ) return c.randomUUID()
    return `${Date.now()}-${Math.random().toString( 16 ).slice( 2 )}`
  }

  const readTimeMs = () => {
    const v = videoEl.value
    if ( !v ) return 0
    const t = Number.isFinite( v.currentTime ) ? v.currentTime : 0
    return Math.max( 0, Math.round( t * 1000 ) )
  }

  const tick = () => {
    nowMs.value = readTimeMs()
    if ( isRunning.value ) raf = requestAnimationFrame( tick )
  }

  const isPortrait = ref( false )

  const onLoadedMetadata = () => {
    const v = videoEl.value
    if ( v ) isPortrait.value = v.videoHeight > v.videoWidth
    isReady.value = true
    nowMs.value = readTimeMs()
  }

  const onGo = async () => {
    const v = videoEl.value
    if ( !v ) return

    try {
      v.currentTime = 0
    } catch ( err ) {
      void err
    }

    markers.value = []
    isRunning.value = true
    nowMs.value = readTimeMs()

    cancelAnimationFrame( raf )
    raf = requestAnimationFrame( tick )

    try {
      await v.play()
    } catch ( err ) {
      void err
      isRunning.value = false
      cancelAnimationFrame( raf )
    }
  }

  const addMarker = ( type: MarkerType ) => {
    if ( !isRunning.value ) return
    const tMs = readTimeMs()
    markers.value.push( { id: makeId(), type, tMs } )
  }

  const onStop = () => {
    const v = videoEl.value
    if ( v ) v.pause()
    isRunning.value = false
    cancelAnimationFrame( raf )
    emit( "stop", { markers: markers.value.slice() } )
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

                <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    class="h-12 rounded-md bg-green-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="!isReady || isRunning"
                    @click="onGo"
                  >
                    GO
                  </button>

                  <button
                    class="h-12 rounded-md bg-gray-900 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="!isRunning"
                    @click="addMarker('surfacing')"
                  >
                    Surfacing
                  </button>

                  <button
                    class="h-12 rounded-md bg-gray-900 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="!isRunning"
                    @click="addMarker('split')"
                  >
                    Split
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
                    <span class="font-semibold">{{ m.type }}</span>
                    <span class="tabular-nums">{{ formatMs(m.tMs) }}</span>
                  </div>
                </div>
              </div>

              <div class="mt-2 text-xs text-gray-500">
                GO starts playback. Surfacing/Split capture the exact video timestamp.
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
