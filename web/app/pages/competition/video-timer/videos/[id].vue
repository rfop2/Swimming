<script setup lang="ts">
  import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Video Library Item",
  } )

  type VideoLibraryItem = {
    id: string
    createdAt: string
    updatedAt?: string | null
    playbackUrl: string
    originalName: string
    mimeType: string
    size: number
    durationMs?: number | null
    sessionId?: string | null
    isLinkedToSession?: boolean
    canCreateSession?: boolean
    swimmerId?: string | null
    swimmerName?: string | null
    course?: string | null
    stroke?: string | null
    distance?: string | null
    notes?: string | null
    meetName?: string | null
    meetDate?: string | null
    officialFinishMs?: number | null
    startOffsetMs?: number | null
    markersCount?: number | null
    compressionStatusId?: number | null
    compressionStatusCode?: string | null
    compressionStatusName?: string | null
    isCompressionReady?: boolean
  }

  const route = useRoute()

  const videoId = computed( () => String( route.params.id || "" ).trim() )
  const createSessionTo = computed( () => ( {
    path: "/competition/video-timer",
    query: {
      ...route.query,
      videoId: data.value?.id ?? videoId.value,
    },
  } ) )

  const { data, pending, error, refresh } = await useFetch<VideoLibraryItem | null>(
    () => `/api/competition/video-timer-library/${videoId.value}`,
    {
      key: () => `video-timer-library-item-${videoId.value}`,
      watch: [ videoId ],
      default: () => null,
    }
  )

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

  const formatDate = ( iso: string | null | undefined ) => {
    if ( !iso ) return "—"
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso
    return dateFormatter.format( d )
  }

  const formatBytes = ( bytes: number | null | undefined ) => {
    const value = Number( bytes ?? 0 )

    if ( value < 1024 ) return `${value} B`
    if ( value < 1024 * 1024 ) return `${( value / 1024 ).toFixed( 1 )} KB`
    if ( value < 1024 * 1024 * 1024 ) return `${( value / ( 1024 * 1024 ) ).toFixed( 1 )} MB`

    return `${( value / ( 1024 * 1024 * 1024 ) ).toFixed( 1 )} GB`
  }

  const formatDuration = ( durationMs: number | null | undefined ) => {
    if ( !durationMs || durationMs <= 0 ) return "—"

    const totalSeconds = Math.floor( durationMs / 1000 )
    const hours = Math.floor( totalSeconds / 3600 )
    const minutes = Math.floor( ( totalSeconds % 3600 ) / 60 )
    const seconds = totalSeconds % 60

    if ( hours > 0 ) {
      return `${String( hours ).padStart( 2, "0" )}:${String( minutes ).padStart( 2, "0" )}:${String( seconds ).padStart( 2, "0" )}`
    }

    return `${String( minutes ).padStart( 2, "0" )}:${String( seconds ).padStart( 2, "0" )}`
  }

  const formatCourse = ( value: string | null | undefined ) => {
    const course = String( value ?? "" ).trim()
    return course ? course.toUpperCase() : "—"
  }

  const linkedLabel = computed( () => {
    if ( !data.value ) return ""
    return data.value.sessionId ? "Linked to session" : "Available"
  } )

  const compressionLabel = computed( () => {
    const code = String( data.value?.compressionStatusCode || "" ).trim()
    if ( !code ) return "Compression unknown"
    return `Compression: ${code}`
  } )

  const compressionBadgeClass = computed( () => {
    const code = String( data.value?.compressionStatusCode || "" ).trim()

    if ( code === "completed" || code === "none" ) {
      return "bg-green-100 text-green-700"
    }

    if ( code === "failed" ) {
      return "bg-red-100 text-red-700"
    }

    return "bg-amber-100 text-amber-700"
  } )


  const createSessionDisabledText = computed( () => {
    if ( !data.value || data.value.sessionId ) return ""
    if ( data.value.canCreateSession ) return ""
    if ( data.value.compressionStatusCode === "failed" ) return "This video failed compression and cannot be used yet."
    return "This video is still being processed and cannot be used yet."
  } )

  const deleting = ref( false )
  const deleteError = ref( "" )

  const deleteVideo = async () => {
    if ( !data.value?.id || deleting.value ) return

    const confirmed = window.confirm( `Delete "${data.value.originalName}"?` )
    if ( !confirmed ) return

    deleteError.value = ""
    deleting.value = true

    try {
      await $fetch( `/api/competition/video-timer-library/${data.value.id}`, {
        method: "DELETE",
      } )

      await navigateTo( "/competition/video-timer/videos" )
    } catch ( err: unknown ) {
      deleteError.value =
        ( err as { data?: { statusMessage?: string; message?: string } } )?.data?.statusMessage
        || ( err as { data?: { statusMessage?: string; message?: string } } )?.data?.message
        || "Failed to delete video."
    } finally {
      deleting.value = false
    }
  }

  let refreshTimer: ReturnType<typeof window.setInterval> | null = null
  let stopCompressionWatch: ( () => void ) | null = null

  const stopRefreshTimer = () => {
    if ( refreshTimer !== null ) {
      window.clearInterval( refreshTimer )
      refreshTimer = null
    }
  }

  onMounted( () => {
    stopCompressionWatch = watch(
      () => data.value?.isCompressionReady,
      ( isReady ) => {
        stopRefreshTimer()

        if ( isReady === false ) {
          refreshTimer = window.setInterval( () => {
            void refresh()
          }, 5000 )
        }
      },
      { immediate: true }
    )
  } )

  onBeforeUnmount( () => {
    stopCompressionWatch?.()
    stopRefreshTimer()
  } )
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-5xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-gray-900">Video details</div>
            <div class="text-xs text-gray-500 mt-1">Review a library video and continue to session creation if needed.</div>
          </div>

          <div class="flex gap-2">
            <NuxtLink class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center" to="/competition/video-timer/videos">
              Back to library
            </NuxtLink>
          </div>
        </div>

        <div v-if="pending" class="mt-4 text-sm text-gray-600">
          Loading…
        </div>

        <div v-else-if="error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div class="text-sm text-red-700">Failed to load video.</div>

          <div class="mt-3">
            <button
              class="h-10 px-4 rounded-md bg-gray-900 text-white"
              type="button"
              @click="refresh()"
            >
              Retry
            </button>
          </div>
        </div>

        <div v-else-if="data" class="mt-4 space-y-4">
          <div v-if="deleteError" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {{ deleteError }}
          </div>

          <div
            v-if="data.compressionStatusCode === 'failed'"
            class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            This video failed compression and cannot be used until it is reprocessed.
          </div>

          <div
            v-else-if="!data.isCompressionReady"
            class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            {{ createSessionDisabledText || "This video is still being processed." }}
          </div>

          <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <video
              class="w-full bg-black"
              :src="data.playbackUrl"
              controls
              playsinline
              preload="metadata"
            />
          </div>

          <div class="rounded-xl border border-gray-200 bg-white p-5">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <div class="text-lg font-semibold text-gray-900 break-all">
                    {{ data.originalName }}
                  </div>

                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="data.sessionId ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'"
                  >
                    {{ linkedLabel }}
                  </span>

                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="compressionBadgeClass"
                  >
                    {{ compressionLabel }}
                  </span>
                </div>

                <div class="mt-2 text-sm text-gray-500">
                  Uploaded at: {{ formatDate(data.createdAt) }}
                </div>
              </div>

              <div class="shrink-0 flex gap-2">
                <NuxtLink
                  v-if="data.canCreateSession"
                  class="h-10 px-4 rounded-md bg-blue-600 text-white flex items-center"
                  :to="createSessionTo"
                >
                  Create session
                </NuxtLink>

                <button
                  v-else-if="!data.sessionId"
                  class="h-10 px-4 rounded-md bg-gray-200 text-gray-500 cursor-not-allowed"
                  type="button"
                  disabled
                >
                  Processing video
                </button>

                <NuxtLink
                  v-if="data.sessionId"
                  class="h-10 px-4 rounded-md bg-gray-900 text-white flex items-center"
                  :to="`/competition/video-timer/sessions/${data.sessionId}`"
                >
                  Open session
                </NuxtLink>

                <button
                  v-if="!data.sessionId"
                  class="h-10 px-4 rounded-md bg-red-600 text-white disabled:bg-red-300"
                  type="button"
                  :disabled="deleting"
                  @click="deleteVideo"
                >
                  {{ deleting ? "Deleting..." : "Delete video" }}
                </button>
              </div>
            </div>

            <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div class="rounded-lg border border-gray-200 p-4">
                <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Video</div>
                <div class="mt-3 space-y-2 text-gray-800">
                  <div><span class="font-medium">Mime type:</span> {{ data.mimeType || "—" }}</div>
                  <div><span class="font-medium">Size:</span> {{ formatBytes(data.size) }}</div>
                  <div><span class="font-medium">Duration:</span> {{ formatDuration(data.durationMs) }}</div>
                  <div><span class="font-medium">Updated at:</span> {{ formatDate(data.updatedAt) }}</div>
                </div>
              </div>

              <div class="rounded-lg border border-gray-200 p-4">
                <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Session link</div>
                <div class="mt-3 space-y-2 text-gray-800">
                  <div><span class="font-medium">Session:</span> {{ data.sessionId || "Not linked" }}</div>
                  <div><span class="font-medium">Markers:</span> {{ data.markersCount ?? 0 }}</div>
                  <div><span class="font-medium">Official finish:</span> {{ data.officialFinishMs ?? "—" }}</div>
                  <div><span class="font-medium">Start offset:</span> {{ data.startOffsetMs ?? "—" }}</div>
                </div>
              </div>

              <div class="rounded-lg border border-gray-200 p-4">
                <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Result data</div>
                <div class="mt-3 space-y-2 text-gray-800">
                  <div><span class="font-medium">Swimmer:</span> {{ data.swimmerName || "—" }}</div>
                  <div><span class="font-medium">Course:</span> {{ formatCourse(data.course) }}</div>
                  <div><span class="font-medium">Stroke:</span> {{ data.stroke || "—" }}</div>
                  <div><span class="font-medium">Distance:</span> {{ data.distance || "—" }}</div>
                </div>
              </div>

              <div class="rounded-lg border border-gray-200 p-4">
                <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Notes</div>
                <div class="mt-3 text-gray-800 whitespace-pre-wrap break-words">
                  {{ data.notes || "—" }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="mt-4 text-sm text-gray-600">
          Video not found.
        </div>
      </div>
    </div>
  </div>
</template>
