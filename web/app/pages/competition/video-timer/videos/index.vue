<script setup lang="ts">
  import { computed, ref } from "vue"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Video Library",
  } )

  type VideoListItem = {
    id: string
    createdAt: string
    updatedAt?: string | null
    originalName: string
    mimeType: string
    size: number
    durationMs?: number | null
    playbackUrl: string
    sessionId?: string | null
    compressionStatusId?: number | null
    compressionStatusCode?: string | null
    compressionStatusName?: string | null
    isCompressionReady?: boolean
    canCreateSession?: boolean
  }

  const search = ref( "" )

  const { data, pending, error, refresh } = await useFetch<VideoListItem[]>(
    "/api/competition/video-timer-library",
    {
      key: "video-timer-library",
      default: () => [],
    }
  )

  const deletingId = ref<string | null>( null )
  const deleteError = ref( "" )

  const deleteVideo = async ( video: VideoListItem ) => {
    if ( deletingId.value ) return

    const confirmed = window.confirm( `Delete "${video.originalName}"?` )
    if ( !confirmed ) return

    deleteError.value = ""
    deletingId.value = video.id

    try {
      await $fetch( `/api/competition/video-timer-library/${video.id}`, {
        method: "DELETE",
      } )

      await refresh()
    } catch ( err: unknown ) {
      deleteError.value =
        ( err as { data?: { statusMessage?: string; message?: string } } )?.data?.statusMessage
        || ( err as { data?: { statusMessage?: string; message?: string } } )?.data?.message
        || "Failed to delete video."
    } finally {
      deletingId.value = null
    }
  }

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

  const formatDate = ( iso: string ) => {
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

  const filteredVideos = computed( () => {
    let items = data.value ?? []

    if ( search.value.trim() ) {
      const term = search.value.trim().toLowerCase()
      items = items.filter( v =>
        String( v.originalName ?? "" ).toLowerCase().includes( term )
      )
    }

    return [ ...items ].sort( ( a, b ) => {
      const aTime = new Date( a.createdAt ).getTime()
      const bTime = new Date( b.createdAt ).getTime()
      return bTime - aTime
    } )
  } )

  const clearFilters = () => {
    search.value = ""
  }
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-gray-900">Video Library</div>
            <div class="text-xs text-gray-500 mt-1">Upload, browse and reuse available videos before creating a session.</div>
          </div>

          <div class="flex gap-2">
            <NuxtLink class="h-10 px-4 rounded-md bg-blue-600 text-white flex items-center" to="/competition/video-timer/videos/new">
              Upload video
            </NuxtLink>

            <NuxtLink class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center" to="/competition/video-timer/sessions">
              Back to sessions
            </NuxtLink>
          </div>
        </div>

        <div class="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-end">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">File name</label>
              <input
                v-model="search"
                type="text"
                class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                placeholder="Search by file name"
              >
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3">
            <div class="text-xs text-gray-500">
              <span v-if="pending">Loading…</span>
              <span v-else>{{ filteredVideos.length }} video<span v-if="filteredVideos.length !== 1">s</span></span>
            </div>

            <button
              class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
              type="button"
              :disabled="!search"
              @click="clearFilters"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div v-if="deleteError" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {{ deleteError }}
        </div>

        <div v-if="pending" class="mt-4 text-sm text-gray-600">
          Loading…
        </div>

        <div v-else-if="error" class="mt-4 text-sm text-red-600">
          Failed to load videos.
        </div>

        <div v-else class="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div v-if="filteredVideos.length === 0" class="p-4 text-sm text-gray-600">
            No available videos found.
          </div>

          <div v-else class="divide-y">
            <div
              v-for="video in filteredVideos"
              :key="video.id"
              class="p-4 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <div class="text-sm font-semibold text-gray-900 truncate">
                      {{ video.originalName }}
                    </div>

                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                      Available
                    </span>

                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="video.isCompressionReady ? 'bg-green-100 text-green-700' : video.compressionStatusCode === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'"
                    >
                      Compression: {{ video.compressionStatusCode || "unknown" }}
                    </span>
                  </div>

                  <div class="mt-1 text-xs text-gray-500">
                    Uploaded at: {{ formatDate(video.createdAt) }}
                    <span> • {{ formatDuration(video.durationMs) }}</span>
                    <span> • {{ formatBytes(video.size) }}</span>
                  </div>
                </div>

                <div class="shrink-0 flex gap-2">
                  <NuxtLink
                    v-if="video.canCreateSession"
                    class="h-10 px-4 rounded-md bg-blue-600 text-white flex items-center"
                    :to="`/competition/video-timer?videoId=${video.id}`"
                  >
                    Create session
                  </NuxtLink>

                  <button
                    v-else
                    class="h-10 px-4 rounded-md bg-gray-200 text-gray-500 cursor-not-allowed"
                    type="button"
                    disabled
                  >
                    {{ video.compressionStatusCode === "failed" ? "Compression failed" : "Processing video" }}
                  </button>

                  <button
                    class="h-10 px-4 rounded-md bg-red-600 text-white disabled:bg-red-300"
                    type="button"
                    :disabled="!!deletingId"
                    @click="deleteVideo(video)"
                  >
                    {{ deletingId === video.id ? "Deleting..." : "Delete" }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>