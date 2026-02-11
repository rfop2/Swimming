<script setup lang="ts">
  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( { title: "Video Timer Session" } )

  type MarkerType = "surfacing" | "split"
  type Marker = {
    id: string
    type: MarkerType
    code: string
    label: string
    tMs: number
  }


  type SessionDetail = {
    id: string
    createdAt: string
    notes?: string | null
    startOffsetMs?: number | null
    swimmer?: { id: string; fullName: string } | null
    meet?: { id: string; name: string } | null
    selections?: { course?: string | null; stroke?: string | null; distance?: string | null } | null
    video?: { playbackUrl: string; originalName?: string | null } | null
    markers: Marker[]
  }

  const toRaceMs = ( videoMs: number ) => {
    const s = data.value?.startOffsetMs ?? 0
    return Math.max( 0, videoMs - s )
  }

  const route = useRoute()
  const id = String( route.params.id || "" )

  const { data, pending, error } = await useAsyncData( `video-timer-session-${id}`, () =>
    $fetch<SessionDetail>( `/api/competition/video-timer-sessions/${encodeURIComponent( id )}` )
  )

  const videoRef = ref<HTMLVideoElement | null>( null )

  const formatMs = ( ms: number ) => {
    const totalMs = Math.max( 0, Math.floor( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const m = Math.floor( totalSeconds / 60 )
    const ss = String( totalSeconds % 60 ).padStart( 2, "0" )
    const t = Math.floor( ( totalMs % 1000 ) / 100 )
    return `${m}:${ss}.${t}`
  }

  const sortedMarkers = computed( () => {
    const markers = data.value?.markers || []
    return [ ...markers ].sort( ( a, b ) => a.tMs - b.tMs )
  } )

  const seekTo = ( tMs: number ) => {
    const v = videoRef.value
    if ( !v ) return
    v.currentTime = Math.max( 0, tMs / 1000 )
    v.pause()
  }
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-5xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-gray-900">Session</div>
            <div v-if="data" class="text-xs text-gray-500 mt-1">
              {{ data.swimmer?.fullName || "Unknown swimmer" }}

              <span v-if="data.selections">
                • {{ data.selections.distance || "?" }} {{ data.selections.stroke || "?" }} ({{ data.selections.course || "?" }})
              </span>
              <span v-if="data.meet?.name">
                • {{ data.meet.name }}
              </span>
              • {{ new Date(data.createdAt).toLocaleString() }}
            </div>
          </div>

          <NuxtLink class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center" to="/competition/video-timer/sessions">
            Back
          </NuxtLink>
        </div>

        <div v-if="pending" class="mt-4 text-sm text-gray-600">Loading…</div>
        <div v-else-if="error" class="mt-4 text-sm text-red-600">Failed to load session.</div>

        <div v-else-if="data" class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div class="w-full">
            <div class="text-sm font-semibold text-gray-800 mb-2">Video</div>

            <div class="w-full rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
              <div class="p-3 text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                <div v-if="data.video?.originalName">
                  <span class="font-semibold">File:</span> {{ data.video.originalName }}
                </div>

                <div>
                  <span class="font-semibold">Markers:</span> {{ sortedMarkers.length }}
                </div>

                <div v-if="data.startOffsetMs !== undefined && data.startOffsetMs !== null">
                  <span class="font-semibold">Start offset:</span> {{ formatMs(data.startOffsetMs) }}
                </div>
              </div>

              <div class="aspect-video bg-black flex items-center justify-center max-h-[520px] overflow-hidden">
                <video
                  v-if="data.video?.playbackUrl"
                  ref="videoRef"
                  :src="data.video.playbackUrl"
                  controls
                  playsinline
                  class="w-full h-full object-contain"
                />
              </div>
            </div>

            <div v-if="data.notes" class="mt-3 text-sm text-gray-700">
              <span class="font-semibold">Notes:</span> {{ data.notes }}
            </div>
          </div>

          <div class="w-full">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-semibold text-gray-800">Markers</div>
            </div>

            <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div v-if="sortedMarkers.length === 0" class="p-4 text-sm text-gray-500">
                No markers.
              </div>

              <div v-else class="divide-y">
                <div v-for="m in sortedMarkers" :key="m.id" class="p-3 flex items-center gap-3">
                  <button class="h-9 px-3 rounded-md bg-gray-100 text-gray-900" type="button" @click="seekTo(m.tMs)">
                    {{ formatMs(toRaceMs(m.tMs)) }}
                  </button>

                  <div class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {{ m.label || m.type }}
                  </div>

                  <div class="text-xs text-gray-500 tabular-nums">
                    {{ m.tMs }} ms
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              Click a time to jump the video to that moment.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
