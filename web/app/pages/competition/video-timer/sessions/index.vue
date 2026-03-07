<script setup lang="ts">
  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Video Timer Sessions",
  } )

  type SessionListItem = {
    id: string
    createdAt: string
    swimmerName?: string | null
    course?: string | null
    stroke?: string | null
    distance?: string | null
    notes?: string | null
    markersCount?: number | null
    videoOriginalName?: string | null
  }

  const swimmerFilter = ref( "" )

  const { data, pending, error, refresh } = await useAsyncData( "video-timer-sessions", () =>
    $fetch<SessionListItem[]>( "/api/competition/video-timer-sessions" )
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

  const formatDate = ( iso: string ) => {
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso
    return dateFormatter.format( d )
  }

  const normalizedSwimmerFilter = computed( () => swimmerFilter.value.trim().toLowerCase() )

  const filteredSessions = computed( () => {
    const items = data.value ?? []
    const q = normalizedSwimmerFilter.value

    if ( !q ) return items

    return items.filter( s => String( s.swimmerName ?? "" ).toLowerCase().includes( q ) )
  } )
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-5xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-gray-900">Sessions</div>
            <div class="text-xs text-gray-500 mt-1">Browse and reopen saved video timer sessions.</div>
          </div>

          <div class="flex gap-2">
            <NuxtLink class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center" to="/competition/video-timer">
              Back to timer
            </NuxtLink>
            <button class="h-10 px-4 rounded-md bg-gray-900 text-white" type="button" @click="refresh()">
              Refresh
            </button>
          </div>
        </div>

        <div class="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div class="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_auto] gap-3 items-end">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">
                Filter by swimmer
              </label>
              <input
                v-model="swimmerFilter"
                type="text"
                placeholder="Type swimmer name"
                class="w-full h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-900"
              >
            </div>

            <div class="text-xs text-gray-500">
              <span v-if="pending">Loading…</span>
              <span v-else>{{ filteredSessions.length }} session<span v-if="filteredSessions.length !== 1">s</span></span>
            </div>
          </div>
        </div>

        <div v-if="pending" class="mt-4 text-sm text-gray-600">Loading…</div>

        <div v-else-if="error" class="mt-4 text-sm text-red-600">
          Failed to load sessions.
        </div>

        <div v-else class="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div v-if="filteredSessions.length === 0" class="p-4 text-sm text-gray-600">
            No sessions found.
          </div>

          <div v-else class="divide-y">
            <NuxtLink
              v-for="s in filteredSessions"
              :key="s.id"
              class="block p-4 hover:bg-gray-50 transition-colors"
              :to="`/competition/video-timer/sessions/${s.id}`"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-gray-900 truncate">
                    {{ s.distance || "?" }} {{ s.stroke || "?" }} ({{ s.course || "?" }})
                  </div>

                  <div v-if="s.swimmerName" class="text-sm text-gray-700 mt-1 truncate">
                    {{ s.swimmerName }}
                  </div>

                  <div class="text-xs text-gray-500 mt-1">
                    {{ formatDate(s.createdAt) }}
                    <span v-if="s.videoOriginalName"> • {{ s.videoOriginalName }}</span>
                    <span v-if="typeof s.markersCount === 'number'"> • {{ s.markersCount }} markers</span>
                  </div>

                  <div v-if="s.notes" class="text-sm text-gray-700 mt-2 line-clamp-2">
                    {{ s.notes }}
                  </div>
                </div>

                <div class="shrink-0 text-xs text-gray-500">
                  Open →
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>