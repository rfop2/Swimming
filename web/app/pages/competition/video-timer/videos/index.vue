<script setup lang="ts">
  import { computed, ref, watch } from "vue"

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

  type FilterOption = {
    value: string
    label: string
  }

  const { swimmers } = useSwimmers()

  const selectedSwimmerId = ref( "" )

  const swimmerOptions = computed<FilterOption[]>( () => [
    { value: "", label: "All swimmers" },
    ...swimmers.value.map( s => ( {
      value: s.id,
      label: s.fullName,
    } ) ),
  ] )

  const search = ref( "" )
  const selectedStatus = ref( "" )
  const selectedStroke = ref( "" )
  const selectedDistance = ref( "" )

  const { data, pending, error } = await useAsyncData( "video-timer-library", () =>
    $fetch<VideoListItem[]>( "/api/competition/video-timer-library" )
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

  const meetDateFormatter = new Intl.DateTimeFormat( "en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  } )

  const formatDate = ( iso: string ) => {
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso
    return dateFormatter.format( d )
  }

  const formatMeetDate = ( iso: string | null | undefined ) => {
    if ( !iso ) return "—"
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso
    return meetDateFormatter.format( d )
  }

  const formatCourse = ( value: string | null | undefined ) => {
    const course = String( value ?? "" ).trim()
    return course ? course.toUpperCase() : "—"
  }

  const toLabel = ( value: string ) => value.charAt( 0 ).toUpperCase() + value.slice( 1 )

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

  const statusOptions = computed<FilterOption[]>( () => [
    { value: "", label: "All statuses" },
    { value: "available", label: "Available" },
    { value: "linked", label: "Linked to session" },
  ] )

  const strokeOptions = computed<FilterOption[]>( () => {
    const values = Array.from(
      new Set(
        ( data.value ?? [] )
          .map( v => String( v.stroke ?? "" ).trim() )
          .filter( Boolean )
      )
    ).sort( ( a, b ) => a.localeCompare( b, "en-GB" ) )

    return [
      { value: "", label: "All strokes" },
      ...values.map( value => ( { value, label: toLabel( value ) } ) ),
    ]
  } )

  const distanceOptions = computed<FilterOption[]>( () => {
    const items = data.value ?? []
    const filteredByStroke = selectedStroke.value
      ? items.filter( v => String( v.stroke ?? "" ).trim() === selectedStroke.value )
      : items

    const values = Array.from(
      new Set(
        filteredByStroke
          .map( v => String( v.distance ?? "" ).trim() )
          .filter( Boolean )
      )
    ).sort( ( a, b ) => a.localeCompare( b, "en-GB", { numeric: true } ) )

    return [
      { value: "", label: "All distances" },
      ...values.map( value => ( { value, label: value } ) ),
    ]
  } )

  watch( selectedStroke, () => {
    if ( selectedDistance.value && !distanceOptions.value.find( option => option.value === selectedDistance.value ) ) {
      selectedDistance.value = ""
    }
  } )

  const filteredVideos = computed( () => {
    let items = data.value ?? []

    if ( selectedSwimmerId.value ) {
      items = items.filter( v => v.swimmerId === selectedSwimmerId.value )
    }

    if ( selectedStatus.value === "available" ) {
      items = items.filter( v => !v.sessionId )
    }

    if ( selectedStatus.value === "linked" ) {
      items = items.filter( v => !!v.sessionId )
    }

    if ( selectedStroke.value ) {
      items = items.filter( v => String( v.stroke ?? "" ).trim() === selectedStroke.value )
    }

    if ( selectedDistance.value ) {
      items = items.filter( v => String( v.distance ?? "" ).trim() === selectedDistance.value )
    }

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
    selectedSwimmerId.value = ""
    search.value = ""
    selectedStatus.value = ""
    selectedStroke.value = ""
    selectedDistance.value = ""
  }
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-gray-900">Video Library</div>
            <div class="text-xs text-gray-500 mt-1">Upload, browse and reuse videos before creating a session.</div>
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
              <UI-Listbox
                v-model="selectedSwimmerId"
                :options="swimmerOptions"
                label="Swimmer"
                placeholder="Choose swimmer"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">File name</label>
              <input
                v-model="search"
                type="text"
                class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                placeholder="Search by file name"
              >
            </div>

            <div>
              <UI-Listbox
                v-model="selectedStatus"
                :options="statusOptions"
                label="Status"
                placeholder="Choose status"
              />
            </div>

            <div>
              <UI-Listbox
                v-model="selectedStroke"
                :options="strokeOptions"
                label="Stroke"
                placeholder="Choose stroke"
              />
            </div>

            <div>
              <UI-Listbox
                v-model="selectedDistance"
                :options="distanceOptions"
                label="Distance"
                placeholder="Choose distance"
              />
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
              :disabled="!selectedSwimmerId && !search && !selectedStatus && !selectedStroke && !selectedDistance"
              @click="clearFilters"
            >
              Clear filters
            </button>
          </div>

          
        </div>

        <div v-if="pending" class="mt-4 text-sm text-gray-600">Loading…</div>

        <div v-else-if="error" class="mt-4 text-sm text-red-600">
          Failed to load videos.
        </div>

        <div v-else class="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div v-if="filteredVideos.length === 0" class="p-4 text-sm text-gray-600">
            No videos found.
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

                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="video.sessionId ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'"
                    >
                      {{ video.sessionId ? "Linked to session" : "Available" }}
                    </span>
                  </div>

                  <div class="mt-1 text-xs text-gray-500">
                    Uploaded at: {{ formatDate(video.createdAt) }}
                    <span> • {{ formatDuration(video.durationMs) }}</span>
                    <span> • {{ formatBytes(video.size) }}</span>
                  </div>

                  <div v-if="video.sessionId" class="mt-2 text-sm font-medium text-gray-900 truncate">
                    {{ video.distance || "?" }} {{ video.stroke || "?" }} ({{ formatCourse(video.course) }})
                  </div>

                  <div v-if="video.meetName" class="mt-1 text-sm text-gray-600 truncate">
                    {{ video.meetName }} • {{ formatMeetDate(video.meetDate) }}
                  </div>
                </div>

                <div class="shrink-0 flex gap-2">
                  <NuxtLink
                    class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center"
                    :to="`/competition/video-timer/videos/${video.id}`"
                  >
                    Open
                  </NuxtLink>

                  <NuxtLink
                    v-if="!video.sessionId"
                    class="h-10 px-4 rounded-md bg-blue-600 text-white flex items-center"
                    :to="`/competition/video-timer?videoId=${video.id}`"
                  >
                    Create session
                  </NuxtLink>

                  <NuxtLink
                    v-else
                    class="h-10 px-4 rounded-md bg-gray-900 text-white flex items-center"
                    :to="`/competition/video-timer/sessions/${video.sessionId}`"
                  >
                    Open session
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>