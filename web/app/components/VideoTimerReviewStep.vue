<!-- app/components/VideoTimerReviewStep.vue -->
<script setup lang="ts">
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

  const props = defineProps<{
    video: UploadedVideo
    selections: { course: string; stroke: string; distance: string }
    swimmer: SwimmerRef
    notes: string
    markers: Marker[]
  }>()

  const emit = defineEmits<{
    ( e: "back" ): void
    ( e: "update:markers", v: Marker[] ): void
    ( e: "saved", payload: { sessionId: string } ): void
  }>()

  const videoRef = ref<HTMLVideoElement | null>( null )
  const saving = ref( false )
  const errorMsg = ref<string | null>( null )
  const savedId = ref<string | null>( null )

  const formatMs = ( ms: number ) => {
    const total = Math.max( 0, Math.floor( ms ) )
    const m = Math.floor( total / 60000 )
    const s = Math.floor( ( total % 60000 ) / 1000 )
    const r = total % 1000
    const mm = String( m )
    const ss = String( s ).padStart( 2, "0" )
    const rr = String( r ).padStart( 3, "0" )
    return `${mm}:${ss}.${rr}`
  }

  const sortedMarkers = computed( () => {
    return [ ...props.markers ].sort( ( a, b ) => a.tMs - b.tMs )
  } )

  const hasMarkers = computed( () => sortedMarkers.value.length > 0 )

  const seekTo = ( tMs: number ) => {
    const v = videoRef.value
    if ( !v ) return
    const t = Math.max( 0, tMs / 1000 )
    v.currentTime = t
    v.pause()
  }

  const updateMarkerTime = ( id: string, nextMs: number ) => {
    const next = props.markers.map( ( m ) =>
      m.id === id ? { ...m, tMs: Math.max( 0, Math.floor( nextMs ) ) } : m
    )
    emit( "update:markers", next )
  }

  const removeMarker = ( id: string ) => {
    const next = props.markers.filter( ( m ) => m.id !== id )
    emit( "update:markers", next )
  }

  const clearAll = () => {
    emit( "update:markers", [] )
  }

  const canSave = computed( () => {
    if ( saving.value ) return false
    if ( !props.video?.id ) return false
    if ( !hasMarkers.value ) return false
    return true
  } )

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

    return "Failed to save session."
  }

  const saveSession = async () => {
    errorMsg.value = null
    savedId.value = null

    if ( !canSave.value ) {
      if ( !props.video?.id ) errorMsg.value = "Video not uploaded yet."
      else if ( !hasMarkers.value ) errorMsg.value = "Add at least one marker before saving."
      return
    }

    saving.value = true
    try {
      const res = await $fetch<{ id: string }>( "/api/competition/video-timer-session", {
        method: "POST",
        body: {
          video: props.video,
          selections: props.selections,
          swimmer: props.swimmer ?? null,
          notes: props.notes ?? "",
          markers: sortedMarkers.value,
        },
      } )
      savedId.value = res.id
      emit( "saved", { sessionId: res.id } )
    } catch ( e: unknown ) {
      errorMsg.value = getErrorMessage( e )
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden select-none">
    <div class="flex-1 overflow-y-auto">
      <div class="flex flex-col items-center px-6 py-6">
        <div class="w-full max-w-5xl">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-lg font-semibold text-gray-900">Review</div>
              <div class="text-xs text-gray-500 mt-1">
                Course: {{ selections.course }} • Stroke: {{ selections.stroke }} • Distance: {{ selections.distance }}
              </div>
            </div>

            <button class="h-10 px-4 rounded-md bg-gray-200 text-gray-900" type="button" @click="emit('back')">
              Back
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div class="w-full">
              <div class="text-sm font-semibold text-gray-800 mb-2">Video</div>

              <div class="w-full rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
                <div class="p-3 text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                  <div><span class="font-semibold">Source:</span> Server</div>
                  <div><span class="font-semibold">File:</span> {{ video.originalName }}</div>
                  <div v-if="video.durationMs !== undefined">
                    <span class="font-semibold">Duration:</span> {{ (video.durationMs / 1000).toFixed(2) }}s
                  </div>
                </div>

                <div class="aspect-video bg-black flex items-center justify-center max-h-[420px] overflow-hidden">
                  <video ref="videoRef" :src="video.playbackUrl" controls playsinline class="w-full h-full object-contain" />
                </div>
              </div>

              <div v-if="notes" class="mt-3 text-sm text-gray-700">
                <span class="font-semibold">Notes:</span> {{ notes }}
              </div>
            </div>

            <div class="w-full">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-semibold text-gray-800">Markers ({{ sortedMarkers.length }})</div>
                <button
                  class="h-9 px-3 rounded-md bg-gray-200 text-gray-900 disabled:opacity-50"
                  type="button"
                  :disabled="sortedMarkers.length === 0"
                  @click="clearAll"
                >
                  Clear all
                </button>
              </div>

              <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div v-if="sortedMarkers.length === 0" class="p-4 text-sm text-gray-500">
                  No markers yet. Go back and add Surfacing/Split marks.
                </div>

                <div v-else class="divide-y">
                  <div v-for="m in sortedMarkers" :key="m.id" class="p-3 flex items-center gap-3">
                    <button class="h-9 px-3 rounded-md bg-gray-100 text-gray-900" type="button" @click="seekTo(m.tMs)">
                      {{ formatMs(m.tMs) }}
                    </button>

                    <div class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                      {{ m.type }}
                    </div>

                    <div class="flex-1">
                      <input
                        class="w-full h-9 px-3 rounded-md border border-gray-300 text-sm"
                        type="number"
                        min="0"
                        step="1"
                        :value="m.tMs"
                        @input="updateMarkerTime(m.id, Number(($event.target as HTMLInputElement).value))"
                      >
                      <div class="text-[11px] text-gray-500 mt-1">milliseconds (click the time button to seek)</div>
                    </div>

                    <button class="h-9 px-3 rounded-md bg-red-50 text-red-700" type="button" @click="removeMarker(m.id)">
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="errorMsg" class="mt-3 text-sm text-red-600">
                {{ errorMsg }}
              </div>

              <div v-if="savedId" class="mt-3 text-sm text-green-700">
                Saved: {{ savedId }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t bg-white px-6 py-4">
      <div class="w-full max-w-5xl mx-auto flex gap-3">
        <button
          class="flex-1 h-12 rounded-md bg-green-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          type="button"
          :disabled="!canSave"
          @click="saveSession"
        >
          {{ saving ? "Saving…" : "Save session" }}
        </button>

        <button class="h-12 px-4 rounded-md bg-gray-200 text-gray-900" type="button" @click="emit('back')">
          Back
        </button>
      </div>
    </div>
  </div>
</template>
