<script setup lang="ts">
  type VideoListItem = {
    id: string
    createdAt: string
    originalName: string
    mimeType: string
    size: number
    durationMs?: number | null
    playbackUrl: string
    sessionId?: string | null
    swimmerId?: string | null
    swimmerName?: string | null
    course?: string | null
    stroke?: string | null
    distance?: string | null
    meetName?: string | null
    meetDate?: string | null
  }

  const props = defineProps<{
    open: boolean
    uploadQuery?: Record<string, string>
  }>()

  const emit = defineEmits<{
    ( e: "close" ): void
    ( e: "select", video: VideoListItem ): void
  }>()

  const search = ref( "" )

  const { data, pending, error, refresh } = await useFetch<VideoListItem[]>(
    "/api/competition/video-timer-library",
    {
      key: "video-timer-library-modal",
      default: () => [],
    }
  )

  const availableVideos = computed( () => {
    const items = [ ...( data.value ?? [] ) ]

    const term = search.value.trim().toLowerCase()
    if ( !term ) return items

    return items.filter( video =>
      String( video.originalName ?? "" ).toLowerCase().includes( term )
    )
  } )

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

  const formatDate = ( iso: string | null | undefined ) => {
    if ( !iso ) return "—"
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso

    return new Intl.DateTimeFormat( "en-GB", {
      timeZone: "Europe/London",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    } ).format( d )
  }

  watch(
    () => props.open,
    ( isOpen ) => {
      if ( isOpen ) {
        search.value = ""
        refresh()
      }
    }
  )

  const uploadNewVideoTo = computed( () => ( {
    path: "/competition/video-timer/videos/new",
    query: props.uploadQuery ?? {},
  } ) )
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-4xl rounded-2xl bg-white shadow-xl overflow-hidden">
        <div class="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <div class="text-lg font-semibold text-gray-900">Choose a video</div>
            <div class="text-xs text-gray-500 mt-1">Select an available library video to create a session for this result.</div>
          </div>

          <button
            type="button"
            class="h-10 px-4 rounded-md bg-gray-200 text-gray-900"
            @click="emit('close')"
          >
            Close
          </button>
        </div>

        <div class="border-b border-gray-200 px-5 py-4">
          <input
            v-model="search"
            type="text"
            class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
            placeholder="Search by file name"
          >
        </div>

        <div class="max-h-[70vh] overflow-y-auto">
          <div v-if="pending" class="p-5 text-sm text-gray-600">
            Loading videos…
          </div>

          <div v-else-if="error" class="p-5">
            <div class="text-sm text-red-600">Failed to load available videos.</div>
            <button
              type="button"
              class="mt-3 h-10 px-4 rounded-md bg-gray-900 text-white"
              @click="refresh()"
            >
              Retry
            </button>
          </div>

          <div v-else-if="availableVideos.length === 0" class="p-5 text-sm text-gray-600">
            No available videos found.
          </div>

          <div v-else class="divide-y divide-gray-200">
            <button
              v-for="video in availableVideos"
              :key="video.id"
              type="button"
              class="block w-full p-5 text-left hover:bg-gray-50 transition-colors"
              @click="emit('select', video)"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-gray-900 truncate">
                    {{ video.originalName }}
                  </div>

                  <div class="mt-1 text-xs text-gray-500">
                    Uploaded at: {{ formatDate(video.createdAt) }}
                    <span> • {{ formatDuration(video.durationMs) }}</span>
                    <span> • {{ formatBytes(video.size) }}</span>
                  </div>

                </div>

                <div class="shrink-0">
                  <span class="inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white">
                    Use video
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div class="border-t border-gray-200 px-5 py-4 flex justify-end">
          <NuxtLink
            class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center"
            :to="uploadNewVideoTo"
          >
            Upload new video
          </NuxtLink>
        </div>
      </div>
    </div>
  </Teleport>
</template>
