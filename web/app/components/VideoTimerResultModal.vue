<script setup lang="ts">
  type ResultLink = {
    resultSwimmer: string | null
    resultCourse: string | null
    resultStroke: string | null
    resultDistance: string | null
    resultSeq: string | null
    resultDate?: string | null
  }

  type ResultRow = {
    swimmer: string
    course: string
    stroke: string
    distance: string
    seq: number
    date: string
    meet: string
    round: string
  }

  const props = defineProps<{
    open: boolean
    sessionId: string
    swimmerId?: string | null
    course?: string | null
    stroke?: string | null
    distance?: string | null
    currentResultLink?: ResultLink | null
  }>()

  const emit = defineEmits<{
    ( e: "close" | "saved" ): void
  }>()

  const NO_LINK_KEY = "__no_link__"

  const buildResultKey = ( payload: {
    swimmer: string
    course: string
    stroke: string
    distance: string
    seq: string | number
  } ) =>
    `${payload.swimmer}__${payload.course}__${payload.stroke}__${payload.distance}__${String( payload.seq )}`

  const search = ref( "" )
  const selectedKey = ref<string>( NO_LINK_KEY )
  const saving = ref( false )
  const saveError = ref<string | null>( null )

  const enabled = computed( () =>
    !!props.sessionId &&
    !!props.swimmerId &&
    !!props.course &&
    !!props.stroke &&
    !!props.distance
  )

  const currentLinkedKey = computed( () => {
    const link = props.currentResultLink
    if (
      !link?.resultSwimmer
      || !link.resultCourse
      || !link.resultStroke
      || !link.resultDistance
      || !link.resultSeq
    ) {
      return NO_LINK_KEY
    }

    return buildResultKey( {
      swimmer: link.resultSwimmer,
      course: link.resultCourse,
      stroke: link.resultStroke,
      distance: link.resultDistance,
      seq: link.resultSeq,
    } )
  } )

  const isCurrentlyLinkedKey = ( key: string ) =>
    key !== NO_LINK_KEY && key === currentLinkedKey.value

  const isCurrentlyUnlinked = computed( () => currentLinkedKey.value === NO_LINK_KEY )

  const fetchKey = computed( () =>
    `video-timer-result-modal-${props.sessionId}-${props.swimmerId ?? ""}-${props.course ?? ""}-${props.stroke ?? ""}-${props.distance ?? ""}`
  )

  const fetchQuery = computed( () => ( {
    swimmerId: props.swimmerId ?? undefined,
    course: props.course ?? undefined,
    stroke: props.stroke ?? undefined,
    distance: props.distance ?? undefined,
    currentSessionId: props.sessionId,
  } ) )

  const { data, pending, error, refresh } = await useFetch<ResultRow[]>(
    "/api/competition/results-video-timer-sessions",
    {
      key: fetchKey,
      query: fetchQuery,
      default: () => [],
      immediate: false,
    }
  )

  const normalizeText = ( value: string ) =>
    String( value ?? "" )
      .toLowerCase()
      .normalize( "NFD" )
      .replace( /[\u0300-\u036f]/g, "" )
      .replace( /[•·]/g, " " )
      .replace( /\s+/g, " " )
      .trim()

  const visibleResults = computed( () => {
    const rows = [ ...( data.value ?? [] ) ]
    const term = normalizeText( search.value )

    if ( !term ) return rows

    return rows.filter( row => {
      const haystack = normalizeText(
        `${row.date} ${row.meet} ${row.round} ${row.seq}`
      )

      return haystack.includes( term )
    } )
  } )

  const selectedResult = computed( () => {
    if ( selectedKey.value === NO_LINK_KEY ) return null

    return ( data.value ?? [] ).find( result =>
      buildResultKey( {
        swimmer: result.swimmer,
        course: result.course,
        stroke: result.stroke,
        distance: result.distance,
        seq: result.seq,
      } ) === selectedKey.value
    ) ?? null
  } )

  const formatDisplayDate = ( value?: string | null ) => {
    const s = String( value ?? "" ).trim()
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec( s )
    if ( !m ) return s
    return `${m[3]}/${m[2]}/${m[1]}`
  }

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

    return "Failed to update result."
  }

  const save = async () => {
    if ( saving.value ) return

    saveError.value = null
    saving.value = true

    try {
      if ( selectedKey.value === NO_LINK_KEY ) {
        await $fetch( `/api/competition/video-timer-sessions/${props.sessionId}/result`, {
          method: "PUT",
          body: {
            resultSwimmer: null,
            resultCourse: null,
            resultStroke: null,
            resultDistance: null,
            resultSeq: null,
          },
        } )

        emit( "saved" )
        emit( "close" )
        return
      }

      if ( !selectedResult.value ) {
        throw new Error( "Select a result first." )
      }

      await $fetch( `/api/competition/video-timer-sessions/${props.sessionId}/result`, {
        method: "PUT",
        body: {
          resultSwimmer: selectedResult.value.swimmer,
          resultCourse: selectedResult.value.course,
          resultStroke: selectedResult.value.stroke,
          resultDistance: selectedResult.value.distance,
          resultSeq: String( selectedResult.value.seq ),
        },
      } )

      emit( "saved" )
      emit( "close" )
    } catch ( e: unknown ) {
      saveError.value = getErrorMessage( e )
    } finally {
      saving.value = false
    }
  }

  watch(
    () => props.open,
    async ( isOpen ) => {
      if ( !isOpen ) return

      search.value = ""
      saveError.value = null
      selectedKey.value = currentLinkedKey.value

      if ( enabled.value ) {
        await refresh()
      }
    }
  )
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
            <div class="text-lg font-semibold text-gray-900">Change linked result</div>
            <div class="text-xs text-gray-500 mt-1">Choose the result to link to this session.</div>
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
            placeholder="Search by date, meet, round or seq"
          >
        </div>

        <div class="max-h-[70vh] overflow-y-auto">
          <div v-if="pending" class="p-5 text-sm text-gray-600">
            Loading results…
          </div>

          <div v-else-if="error" class="p-5">
            <div class="text-sm text-red-600">Failed to load results.</div>
            <button
              type="button"
              class="mt-3 h-10 px-4 rounded-md bg-gray-900 text-white"
              @click="refresh()"
            >
              Retry
            </button>
          </div>

          <div v-else-if="!enabled" class="p-5 text-sm text-gray-600">
            Session swimmer, course, stroke and distance are required.
          </div>

          <div v-else>
            <button
              type="button"
              class="block w-full p-5 text-left border-b border-gray-200 transition-colors"
              :class="selectedKey === NO_LINK_KEY ? 'bg-indigo-50' : 'hover:bg-gray-50'"
              @click="selectedKey = NO_LINK_KEY"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <div class="text-sm font-semibold text-gray-900">
                      No linked result
                    </div>

                    <span
                      v-if="isCurrentlyUnlinked"
                      class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                    >
                      Currently linked
                    </span>
                  </div>

                  <div class="mt-1 text-xs text-gray-500">
                    Keep this session without a linked result.
                  </div>
                </div>

                <div class="shrink-0">
                  <span
                    class="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium"
                    :class="selectedKey === NO_LINK_KEY ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900'"
                  >
                    {{ selectedKey === NO_LINK_KEY ? "Selected" : "Select" }}
                  </span>
                </div>
              </div>
            </button>

            <div v-if="visibleResults.length === 0" class="p-5 text-sm text-gray-600">
              No matches.
            </div>

            <div v-else class="divide-y divide-gray-200">
              <button
                v-for="result in visibleResults"
                :key="buildResultKey({ swimmer: result.swimmer, course: result.course, stroke: result.stroke, distance: result.distance, seq: result.seq })"
                type="button"
                class="block w-full p-5 text-left hover:bg-gray-50 transition-colors"
                :class="selectedKey === buildResultKey({ swimmer: result.swimmer, course: result.course, stroke: result.stroke, distance: result.distance, seq: result.seq }) ? 'bg-indigo-50' : ''"
                @click="selectedKey = buildResultKey({ swimmer: result.swimmer, course: result.course, stroke: result.stroke, distance: result.distance, seq: result.seq })"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap min-w-0">
                      <div class="text-sm font-semibold text-gray-900 truncate">
                        {{ formatDisplayDate(result.date) }} • {{ result.meet }}
                      </div>

                      <span
                        v-if="isCurrentlyLinkedKey(buildResultKey({ swimmer: result.swimmer, course: result.course, stroke: result.stroke, distance: result.distance, seq: result.seq }))"
                        class="inline-flex items-center rounded-full bg-green-600 px-2 py-0.5 text-[14px] font-medium text-white"
                      >
                        Currently linked
                      </span>
                    </div>

                    <div class="mt-1 text-xs text-gray-500">
                      <span>Round: {{ result.round || "—" }}</span>
                      <span> • Seq: {{ result.seq }}</span>
                    </div>
                  </div>

                  <div class="shrink-0">
                    <span
                      class="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium"
                      :class="selectedKey === buildResultKey({ swimmer: result.swimmer, course: result.course, stroke: result.stroke, distance: result.distance, seq: result.seq }) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900'"
                    >
                      {{ selectedKey === buildResultKey({ swimmer: result.swimmer, course: result.course, stroke: result.stroke, distance: result.distance, seq: result.seq }) ? "Selected" : "Select" }}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-200 px-5 py-4">
          <div v-if="saveError" class="mb-3 text-sm text-red-600">
            {{ saveError }}
          </div>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="h-10 px-4 rounded-md bg-gray-200 text-gray-900"
              @click="emit('close')"
            >
              Cancel
            </button>

            <button
              type="button"
              class="h-10 px-4 rounded-md bg-blue-600 text-white disabled:bg-gray-100 disabled:text-gray-400"
              :disabled="saving"
              @click="save"
            >
              {{ saving ? "Saving..." : "Save result" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>