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

  const { data, pending, error, refresh } = await useAsyncData( "video-timer-sessions", () =>
    $fetch<SessionListItem[]>( "/api/competition/video-timer-sessions" )
  )

  const formatDate = ( iso: string ) => {
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso
    return d.toLocaleString()
  }
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

        <div v-if="pending" class="mt-4 text-sm text-gray-600">Loading…</div>

        <div v-else-if="error" class="mt-4 text-sm text-red-600">
          Failed to load sessions.
        </div>

        <div v-else class="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div v-if="!data || data.length === 0" class="p-4 text-sm text-gray-600">
            No sessions saved yet.
          </div>

          <div v-else class="divide-y">
            <NuxtLink
              v-for="s in data"
              :key="s.id"
              class="block p-4 hover:bg-gray-50 transition-colors"
              :to="`/competition/video-timer/sessions/${s.id}`"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-gray-900 truncate">
                    {{ s.selections?.distance || "?" }} {{ s.selections?.stroke || "?" }} ({{ s.selections?.course || "?" }})
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
