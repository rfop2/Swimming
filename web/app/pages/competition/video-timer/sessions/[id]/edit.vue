<script setup lang="ts">
  import type {
    Swimmer,
    VideoTimerDraft,
    VideoTimerMarkerRecord,
    VideoTimerBreathCountRecord,
    VideoTimerStrokeCountRecord,
    VideoTimerTurnAnalysisRecord,
  } from "lib"

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
    notes: string | null
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
    breathCountSlots: [],
    breathMarkers: [],
    turns: [],
    selectedSlotId: null,
    markers: [],
    breakoutStartM: 10,
    breakoutTurnM: null,
  } )

  const step = ref<Step>( "timing" )
  const draft = ref<VideoTimerDraft>( createEmptyDraft() )

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
      markers: structuredClone( session.markers ),
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
    },
    { immediate: true }
  )

  const initialOfficialFinishTime = computed( () =>
    formatOfficialFinishTimeInput( data.value?.computed?.finishTimeMs ?? null )
  )

  const onBackFromTiming = async () => {
    await navigateTo( `/competition/video-timer/sessions/${sessionId.value}` )
  }

  const onBackFromReview = () => {
    step.value = "timing"
  }

  const onStopTiming = ( payload: { markers: VideoTimerMarkerRecord[] } ) => {
    draft.value = {
      ...draft.value,
      markers: payload.markers,
    }
    step.value = "review"
  }

  const onUpdatedSession = async ( { sessionId }: { sessionId: string } ) => {
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
      mode="edit"
      @back="onBackFromTiming"
      @stop="onStopTiming"
      @update:draft="draft = $event"
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
      @back="onBackFromReview"
      @saved="onUpdatedSession"
      @update:draft="draft = $event"
    />
  </div>
</template>
