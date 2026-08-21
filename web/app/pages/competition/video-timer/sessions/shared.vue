<script setup lang="ts">
  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Shared With Me — Video Timer",
  } )

  type SharedSessionListItem = {
    id: string
    shareId: string
    createdAt: string
    swimmerId?: string | null
    swimmerName?: string | null
    course?: string | null
    stroke?: string | null
    distance?: string | null
    notes?: string | null
    markersCount?: number | null
    videoOriginalName?: string | null
    resultName?: string | null
    resultDate?: string | null
    ownerName: string
    ownerEmail: string
  }

  const { data, pending, error, refresh } = await useFetch<SharedSessionListItem[]>(
    "/api/competition/video-timer-sessions-shared-with-me",
    {
      key: "video-timer-sessions-shared-with-me",
      default: () => [],
    }
  )

  const unsharing = ref<Set<string>>( new Set() )

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

  const resultDateFormatter = new Intl.DateTimeFormat( "en-GB", {
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

  const formatResultDate = ( iso: string | null | undefined ) => {
    if ( !iso ) return "—"
    const d = new Date( iso )
    if ( Number.isNaN( d.getTime() ) ) return iso
    return resultDateFormatter.format( d )
  }

  const formatCourse = ( value: string | null | undefined ) => {
    const course = String( value ?? "" ).trim()
    return course ? course.toUpperCase() : "?"
  }

  const unshare = async ( shareId: string ) => {
    if ( unsharing.value.has( shareId ) ) return

    const next = new Set( unsharing.value )
    next.add( shareId )
    unsharing.value = next

    try {
      await $fetch( `/api/competition/video-timer-session-shares/${shareId}`, { method: "DELETE" } )
      await refresh()
    } finally {
      const after = new Set( unsharing.value )
      after.delete( shareId )
      unsharing.value = after
    }
  }
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-5xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-gray-900">Shared with me</div>
            <div class="text-xs text-gray-500 mt-1">Video timer sessions other users have shared with you, read-only.</div>
          </div>

          <div class="flex gap-2">
            <NuxtLink class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center" to="/competition/video-timer/sessions">
              My sessions
            </NuxtLink>
          </div>
        </div>

        <div v-if="pending" class="mt-4 text-sm text-gray-600">Loading…</div>

        <div v-else-if="error" class="mt-4 text-sm text-red-600">
          Failed to load shared sessions.
        </div>

        <div v-else class="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div v-if="data.length === 0" class="p-4 text-sm text-gray-600">
            No one has shared a video timer session with you yet.
          </div>

          <div v-else class="divide-y">
            <div v-for="s in data" :key="s.id" class="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <NuxtLink class="group flex-1 min-w-0 flex items-center justify-between gap-4" :to="`/competition/video-timer/sessions/${s.id}`">
                <div class="min-w-0">
                  <div class="text-xs font-medium text-gray-500">
                    Shared by {{ s.ownerName || s.ownerEmail }} • Result date: {{ formatResultDate(s.resultDate) }}
                  </div>

                  <div v-if="s.resultName" class="mt-1 text-base font-medium text-gray-900 truncate">
                    {{ s.resultName }}
                  </div>

                  <div class="mt-1 text-sm font-semibold text-gray-900 truncate">
                    {{ s.distance || "?" }} {{ s.stroke || "?" }} ({{ formatCourse(s.course) }})
                  </div>

                  <div class="mt-1 text-xs text-gray-400">
                    Created at: {{ formatDate(s.createdAt) }}
                    <span v-if="s.videoOriginalName"> • {{ s.videoOriginalName }}</span>
                    <span v-if="typeof s.markersCount === 'number'"> • {{ s.markersCount }} markers</span>
                  </div>
                </div>

                <div class="shrink-0 text-sm font-medium text-gray-500 group-hover:text-gray-900 transition-colors">
                  Open →
                </div>
              </NuxtLink>

              <button
                type="button"
                class="shrink-0 h-8 px-2 rounded-md bg-gray-200 text-gray-900 text-xs disabled:bg-gray-100 disabled:text-gray-400"
                :disabled="unsharing.has(s.shareId)"
                @click="unshare(s.shareId)"
              >
                {{ unsharing.has(s.shareId) ? "Removing…" : "Unshare" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
