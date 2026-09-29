<script setup lang="ts">
  import type {
    Swimmer,
    VideoTimerDraft,
    VideoTimerMarkerRecord,
    VideoTimerBreathCountRecord,
    VideoTimerStrokeCountRecord,
    VideoTimerStrokeMarkerRecord,
    VideoTimerTurnAnalysisRecord,
  } from "lib"
  import { onBeforeRouteLeave } from "vue-router"

  import VideoTimerReviewStep from "~/components/VideoTimerReviewStep.vue"
  import VideoTimerTimingStep from "~/components/VideoTimerTimingStep.vue"

  definePageMeta( {
    layout: "secure",
    fullBleed: true,
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Edit Video Timer Session",
  } )

  type ResultLink = {
    resultSwimmer: string | null
    resultCourse: string | null
    resultStroke: string | null
    resultDistance: string | null
    resultSeq: string | null
    resultDate: string | null
  }

  type SessionDetail = {
    id: string
    createdAt: string
    status: "draft" | "completed"
    draft: VideoTimerDraft | null
    notes: string | null
    officialFinishMs: number | null
    startOffsetMs: number | null
    selections: {
      course: string
      stroke: string
      distance: string
    }
    swimmer: {
      id: string
      fullName: string
    } | null
    meet: {
      id: string
      name: string
    } | null
    video: {
      id?: string
      playbackUrl: string
      originalName: string
      mimeType: string
      size: number
      durationMs?: number
    }
    markers: VideoTimerMarkerRecord[]
    analysis: {
      breakoutStartM: number | null
    } | null
    strokeCounts: VideoTimerStrokeCountRecord[]
    strokeMarkers?: VideoTimerStrokeMarkerRecord[]
    breathCounts: VideoTimerBreathCountRecord[]
    breathMarkers?: Array<{
      id?: string
      seq?: number
      lengthIndex: number
      fromM: number
      toM: number
      tMs: number
    }>
    turns: VideoTimerTurnAnalysisRecord[]
    computed: {
      finishTimeMs: number | null
    }
    resultLink?: ResultLink
  }

  type Step = "timing" | "review"

  const route = useRoute()
  const sessionId = computed( () => String( route.params.id ?? "" ) )

  const { swimmer } = useSwimmer()

  const createEmptyDraft = (): VideoTimerDraft => ( {
    finishVideoMs: null,
    startOffsetMs: null,
    surfaceSlots: [],
    splitSlots: [],
    strokeCountSlots: [],
    strokeMarkers: [],
    breathCountSlots: [],
    breathMarkers: [],
    turns: [],
    selectedSlotId: null,
    markers: [],
    breakoutStartM: 10,
    breakoutTurnM: null,
  } )

  function cloneJson<T>( value: T ): T {
    return JSON.parse( JSON.stringify( value ) ) as T
  }

  const step = ref<Step>( "timing" )
  const draft = ref<VideoTimerDraft>( createEmptyDraft() )
  const hydrated = ref( false )
  const saveStatus = ref<"idle" | "saving" | "saved" | "error">( "idle" )
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null
  let saveChain = Promise.resolve()
  let saveVersion = 0
  let navigationInProgress = false

  const selections = reactive( {
    course: "",
    stroke: "",
    distance: "",
  } )

  const notes = ref( "" )

  const uploadedVideo = ref<SessionDetail["video"] | null>( null )

  const resultLink = ref<ResultLink>( {
    resultSwimmer: null,
    resultCourse: null,
    resultStroke: null,
    resultDistance: null,
    resultSeq: null,
    resultDate: null,
  } )

  const formatOfficialFinishTimeInput = ( ms: number | null | undefined ) => {
    if ( ms === null || ms === undefined || !Number.isFinite( ms ) ) return ""
    const totalHundredths = Math.round( ms / 10 )
    const totalSeconds = Math.floor( totalHundredths / 100 )
    const hundredths = totalHundredths % 100
    const minutes = Math.floor( totalSeconds / 60 )
    const seconds = totalSeconds % 60
    const fraction = String( hundredths ).padStart( 2, "0" )

    if ( minutes > 0 ) return `${minutes}:${String( seconds ).padStart( 2, "0" )}.${fraction}`
    return `${seconds}.${fraction}`
  }

  const buildEditDraft = ( session: SessionDetail ): VideoTimerDraft => {
    if ( session.status === "draft" && session.draft ) {
      return cloneJson( session.draft )
    }

    const sortedMarkers = [ ...session.markers ].sort( ( a, b ) => a.tMs - b.tMs )
    const finishMarker = [ ...sortedMarkers ].reverse().find(
      marker => marker.code === "finish_time" || marker.code === "finish"
    )

    return {
      finishVideoMs: finishMarker?.tMs ?? null,
      startOffsetMs: session.startOffsetMs,
      surfaceSlots: [],
      splitSlots: [],
      strokeCountSlots: session.strokeCounts.map( ( slot, index ) => ( {
        id: `${slot.lengthIndex}-${slot.fromM}-${slot.toM}-${index}`,
        lengthIndex: slot.lengthIndex,
        fromM: slot.fromM,
        toM: slot.toM,
        label: `${slot.fromM}-${slot.toM}m`,
        count: slot.count,
      } ) ),
      strokeMarkers: ( session.strokeMarkers ?? [] ).map( ( marker, index ) => ( {
        id: marker.id ?? `stroke-marker-${index}`,
        tMs: marker.tMs,
      } ) ),
      breathCountSlots: session.breathCounts.map( ( slot, index ) => ( {
        id: `breath-${slot.lengthIndex}-${slot.fromM}-${slot.toM}-${index}`,
        lengthIndex: slot.lengthIndex,
        fromM: slot.fromM,
        toM: slot.toM,
        label: `Breaths ${slot.fromM}-${slot.toM}m`,
        count: slot.count,
      } ) ),
      breathMarkers: ( session.breathMarkers ?? [] ).map( ( marker, index ) => ( {
        id: marker.id ?? `breath-marker-${index}`,
        tMs: marker.tMs,
      } ) ),
      turns: session.turns.map( turn => ( {
        turnIndex: turn.turnIndex,
        breakoutM: turn.breakoutM ?? 10,
      } ) ),
      selectedSlotId: null,
      markers: cloneJson( session.markers ),
      breakoutStartM: session.analysis?.breakoutStartM ?? 10,
      breakoutTurnM: null,
    }
  }

  const { data, pending, error } = await useFetch<SessionDetail | null>(
    () => `/api/competition/video-timer-sessions/${sessionId.value}`,
    {
      key: () => `video-timer-edit-session-${sessionId.value}`,
      watch: [ sessionId ],
      default: () => null,
    }
  )

  watch(
    () => data.value,
    value => {
      if ( !value ) return
      hydrated.value = false

      selections.course = value.selections.course
      selections.stroke = value.selections.stroke
      selections.distance = value.selections.distance

      notes.value = value.notes ?? ""
      uploadedVideo.value = { ...value.video }

      swimmer.value = value.swimmer
        ? ( { id: value.swimmer.id, fullName: value.swimmer.fullName } as Swimmer )
        : undefined

      draft.value = buildEditDraft( value )

      resultLink.value = value.resultLink ?? {
        resultSwimmer: null,
        resultCourse: null,
        resultStroke: null,
        resultDistance: null,
        resultSeq: null,
        resultDate: null,
      }

      step.value = "timing"
      nextTick( () => {
        hydrated.value = true
        saveStatus.value = value.status === "draft" && value.draft ? "saved" : "idle"
      } )
    },
    { immediate: true }
  )

  const initialOfficialFinishTime = computed( () =>
    formatOfficialFinishTimeInput( data.value?.officialFinishMs ?? data.value?.computed?.finishTimeMs ?? null )
  )

  const sessionFinalized = ref( false )
  const isDraftSession = computed( () => data.value?.status === "draft" && !sessionFinalized.value )

  const saveDraftNow = ( options: { silent?: boolean } = {} ) => {
    if ( !isDraftSession.value || !hydrated.value ) return Promise.resolve( true )
    if ( autosaveTimer ) {
      clearTimeout( autosaveTimer )
      autosaveTimer = null
    }

    const version = ++saveVersion
    let snapshot: VideoTimerDraft
    try {
      snapshot = cloneJson( draft.value )
    } catch {
      if ( !options.silent && !navigationInProgress ) saveStatus.value = "error"
      return Promise.resolve( false )
    }
    if ( !options.silent && !navigationInProgress ) saveStatus.value = "saving"

    const request = saveChain
      .catch( () => undefined )
      .then( () => $fetch( `/api/competition/video-timer-sessions/${sessionId.value}/draft`, {
        method: "PUT",
        body: {
          draft: snapshot,
          notes: notes.value,
        },
      } ) )

    saveChain = request.then( () => undefined, () => undefined )

    return request.then(
      () => {
        if ( version === saveVersion && !options.silent && !navigationInProgress ) saveStatus.value = "saved"
        return true
      },
      () => {
        if ( version === saveVersion && !options.silent && !navigationInProgress ) saveStatus.value = "error"
        return false
      }
    )
  }

  watch(
    draft,
    () => {
      if ( !hydrated.value || !isDraftSession.value ) return
      if ( autosaveTimer ) clearTimeout( autosaveTimer )
      autosaveTimer = setTimeout( () => {
        void saveDraftNow()
      }, 500 )
    },
    { deep: true, flush: "sync" }
  )

  const onDraftUpdate = ( next: VideoTimerDraft ) => {
    draft.value = next
    if ( !hydrated.value || !isDraftSession.value ) return
    if ( autosaveTimer ) clearTimeout( autosaveTimer )
    autosaveTimer = setTimeout( () => {
      void saveDraftNow()
    }, 500 )
  }

  const saveDraftOnPageHide = () => {
    if ( !isDraftSession.value || !hydrated.value ) return
    const body = JSON.stringify( {
      draft: draft.value,
      notes: notes.value,
    } )
    void fetch( `/api/competition/video-timer-sessions/${sessionId.value}/draft`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    } )
  }

  onMounted( () => {
    window.addEventListener( "pagehide", saveDraftOnPageHide )
  } )

  onBeforeRouteLeave( async () => {
    if ( !isDraftSession.value || !hydrated.value ) return true
    navigationInProgress = true
    const saved = await saveDraftNow( { silent: true } )
    if ( saved ) return true

    navigationInProgress = false
    saveStatus.value = "error"
    return false
  } )

  onBeforeUnmount( () => {
    if ( autosaveTimer ) clearTimeout( autosaveTimer )
    window.removeEventListener( "pagehide", saveDraftOnPageHide )
  } )

  const onBackFromTiming = async () => {
    await saveDraftNow()
    await navigateTo( `/competition/video-timer/sessions/${sessionId.value}` )
  }

  const onBackFromReview = () => {
    step.value = "timing"
  }

  const onStopTiming = async ( payload: { markers: VideoTimerMarkerRecord[] } ) => {
    draft.value = {
      ...draft.value,
      markers: payload.markers,
    }
    const saved = await saveDraftNow()
    if ( saved ) step.value = "review"
  }

  const onUpdatedSession = async ( { sessionId }: { sessionId: string } ) => {
    sessionFinalized.value = true
    if ( autosaveTimer ) {
      clearTimeout( autosaveTimer )
      autosaveTimer = null
    }
    await navigateTo( `/competition/video-timer/sessions/${sessionId}` )
  }
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden select-none">
    <div v-if="pending" class="flex-1 flex items-center justify-center text-sm text-gray-600">
      Loading session…
    </div>

    <div v-else-if="error || !uploadedVideo" class="flex-1 flex items-center justify-center text-sm text-red-600">
      Failed to load session.
    </div>

    <VideoTimerTimingStep
      v-else-if="step === 'timing'"
      :video="uploadedVideo"
      :selections="selections"
      :swimmer="swimmer"
      :notes="notes"
      :initial-official-finish-time="initialOfficialFinishTime"
      :result-link="resultLink"
      :draft="draft"
      :save-status="isDraftSession ? saveStatus : undefined"
      mode="edit"
      @back="onBackFromTiming"
      @stop="onStopTiming"
      @update:draft="onDraftUpdate"
    />

    <VideoTimerReviewStep
      v-else
      v-model:markers="draft.markers"
      :video="uploadedVideo"
      :selections="selections"
      :swimmer="swimmer"
      :notes="notes"
      :start-offset-ms="draft.startOffsetMs"
      :result-link="resultLink"
      :draft="draft"
      :session-id="sessionId"
      save-mode="update"
      :completing-draft="isDraftSession"
      @back="onBackFromReview"
      @saved="onUpdatedSession"
      @update:draft="onDraftUpdate"
    />
  </div>
</template>
