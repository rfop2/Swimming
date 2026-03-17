<script setup lang="ts">
  import type { Swimmer } from "lib"

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
  }

  type FilterOption = {
    value: string
    label: string
  }

  const { swimmer } = useSwimmer()

  const selectedStroke = ref( "" )
  const selectedDistance = ref( "" )

  const { data, pending, error } = await useFetch<SessionListItem[]>(
    "/api/competition/video-timer-sessions",
    {
      key: "video-timer-sessions",
      default: () => [],
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

  const toLabel = ( value: string ) => value.charAt( 0 ).toUpperCase() + value.slice( 1 )

  const strokeOptions = computed<FilterOption[]>( () => {
    const values = Array.from(
      new Set(
        ( data.value ?? [] )
          .map( s => String( s.stroke ?? "" ).trim() )
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
      ? items.filter( s => String( s.stroke ?? "" ).trim() === selectedStroke.value )
      : items

    const values = Array.from(
      new Set(
        filteredByStroke
          .map( s => String( s.distance ?? "" ).trim() )
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

  const filteredSessions = computed( () => {
    let items = data.value ?? []

    const selectedSwimmerId = swimmer.value?.id
    if ( selectedSwimmerId ) {
      items = items.filter( s => s.swimmerId === selectedSwimmerId )
    }

    if ( selectedStroke.value ) {
      items = items.filter( s => String( s.stroke ?? "" ).trim() === selectedStroke.value )
    }

    if ( selectedDistance.value ) {
      items = items.filter( s => String( s.distance ?? "" ).trim() === selectedDistance.value )
    }

    return [ ...items ].sort( ( a, b ) => {
      const aTime = new Date( a.resultDate || a.createdAt ).getTime()
      const bTime = new Date( b.resultDate || b.createdAt ).getTime()
      return bTime - aTime
    } )
  } )

  const clearFilters = () => {
    swimmer.value = undefined as Swimmer | undefined
    selectedStroke.value = ""
    selectedDistance.value = ""
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
          </div>
        </div>

        <div class="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,280px)_minmax(0,220px)_minmax(0,220px)_auto_auto] gap-3 items-end">
            <SwimmerSelector v-model="swimmer" />

            <div class="min-w-48">
              <UI-Listbox
                v-model="selectedStroke"
                :options="strokeOptions"
                label="Stroke"
                placeholder="Choose stroke"
              />
            </div>

            <div class="min-w-40">
              <UI-Listbox
                v-model="selectedDistance"
                :options="distanceOptions"
                label="Distance"
                placeholder="Choose distance"
              />
            </div>

            <button
              class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
              type="button"
              :disabled="!swimmer && !selectedStroke && !selectedDistance"
              @click="clearFilters"
            >
              Clear filters
            </button>

            <div class="text-xs text-gray-500 xl:text-right">
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
              class="group block p-4 hover:bg-gray-50 transition-colors"
              :to="`/competition/video-timer/sessions/${s.id}`"
            >
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-xs font-medium text-gray-500">
                    Result date: {{ formatResultDate(s.resultDate) }}
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
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>