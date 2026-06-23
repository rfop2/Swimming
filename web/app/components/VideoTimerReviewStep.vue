<script setup lang="ts">
  import type {
    Swimmer,
    VideoTimerDraft,
    VideoTimerMarkerRecord,
    VideoTimerStrokeCountRecord,
  } from "lib"
  import {
    buildStrokeCountSlots,
    buildTurnPlan,
    buildVideoTimerComputedAnalysis,
    parseDistanceM,
  } from "lib"

  type UploadedVideo = {
    id?: string
    playbackUrl: string
    originalName: string
    mimeType: string
    size: number
    durationMs?: number
  }

  type SwimmerRef = Swimmer | undefined

  const props = defineProps<{
    video: UploadedVideo
    selections: { course: string; stroke: string; distance: string }
    swimmer: SwimmerRef
    notes: string
    markers: VideoTimerMarkerRecord[]
    startOffsetMs: number | null
    resultLink: {
      resultSwimmer: string | null
      resultCourse: string | null
      resultStroke: string | null
      resultDistance: string | null
      resultSeq: string | null
      resultDate: string | null
    }
    draft: VideoTimerDraft
    sessionId?: string | null
    saveMode?: "create" | "update"
  }>()

  const emit = defineEmits<{
    ( e: "back" | "edit-timing" ): void
    ( e: "update:markers", v: VideoTimerMarkerRecord[] ): void
    ( e: "saved", payload: { sessionId: string } ): void
    ( e: "update:draft", v: VideoTimerDraft ): void
  }>()

  const saving = ref( false )
  const errorMsg = ref<string | null>( null )
  const savedId = ref<string | null>( null )
  const FIXED_BREAKOUT_M = 10

  const cloneDraft = (): VideoTimerDraft => ( {
    finishVideoMs: props.draft.finishVideoMs,
    startOffsetMs: props.draft.startOffsetMs,
    surfaceSlots: props.draft.surfaceSlots.map( slot => ( {
      id: slot.id,
      seq: slot.seq,
      type: slot.type,
      code: slot.code,
      label: slot.label,
      lengthIndex: slot.lengthIndex,
      turnIndex: slot.turnIndex,
      videoMs: slot.videoMs,
      missed: slot.missed,
    } ) ),
    splitSlots: props.draft.splitSlots.map( slot => ( {
      id: slot.id,
      seq: slot.seq,
      type: slot.type,
      code: slot.code,
      label: slot.label,
      lengthIndex: slot.lengthIndex,
      turnIndex: slot.turnIndex,
      videoMs: slot.videoMs,
      missed: slot.missed,
    } ) ),
    strokeCountSlots: props.draft.strokeCountSlots.map( slot => ( {
      id: slot.id,
      lengthIndex: slot.lengthIndex,
      fromM: slot.fromM,
      toM: slot.toM,
      label: slot.label,
      count: slot.count,
    } ) ),
    breathCountSlots: props.draft.breathCountSlots.map( slot => ( {
      id: slot.id,
      lengthIndex: slot.lengthIndex,
      fromM: slot.fromM,
      toM: slot.toM,
      label: slot.label,
      count: slot.count,
    } ) ),
    breathMarkers: props.draft.breathMarkers.map( marker => ( {
      id: marker.id,
      tMs: marker.tMs,
    } ) ),
    turns: props.draft.turns.map( turn => ( {
      turnIndex: turn.turnIndex,
      breakoutM: turn.breakoutM,
    } ) ),
    selectedSlotId: props.draft.selectedSlotId,
    markers: props.draft.markers.map( marker => ( {
      id: marker.id,
      seq: marker.seq,
      type: marker.type,
      code: marker.code,
      label: marker.label,
      lengthIndex: marker.lengthIndex,
      turnIndex: marker.turnIndex,
      tMs: marker.tMs,
    } ) ),
    breakoutStartM: props.draft.breakoutStartM,
    breakoutTurnM: props.draft.breakoutTurnM,
  } )

  const updateDraft = ( updater: ( next: VideoTimerDraft ) => void ) => {
    const next = cloneDraft()
    updater( next )
    emit( "update:draft", next )
  }

  const makeId = () => {
    const c = globalThis.crypto as Crypto | undefined
    if ( c?.randomUUID ) return c.randomUUID()
    return `${Date.now()}-${Math.random().toString( 16 ).slice( 2 )}`
  }

  const round1 = ( v: number ) => Math.round( v * 10 ) / 10

  const formatNumber = ( v: number | null | undefined, decimals = 2 ) => {
    if ( v === null || v === undefined || !Number.isFinite( v ) ) return "—"
    return v.toFixed( decimals )
  }

  const formatPercent = ( v: number | null | undefined ) => {
    if ( v === null || v === undefined || !Number.isFinite( v ) ) return "—"
    return `${round1( v ).toFixed( 1 )}%`
  }

  const formatRaceClockMs = ( ms: number | null | undefined ) => {
    if ( ms === null || ms === undefined || !Number.isFinite( ms ) ) return "—"
    const totalHundredths = Math.round( ms / 10 )
    const totalSeconds = Math.floor( totalHundredths / 100 )
    const hundredths = totalHundredths % 100
    const minutes = Math.floor( totalSeconds / 60 )
    const seconds = totalSeconds % 60
    return `${String( minutes ).padStart( 2, "0" )}:${String( seconds ).padStart( 2, "0" )}.${String( hundredths ).padStart( 2, "0" )}`
  }

  const distanceM = computed( () => parseDistanceM( props.selections.distance ) )
  const useCollapsedSections = computed( () => distanceM.value >= 400 )

  const sortedMarkers = computed( () => [ ...props.markers ].sort( ( a, b ) => a.tMs - b.tMs ) )

  const strokeCountPlan = computed( () =>
    buildStrokeCountSlots( props.selections.course, props.selections.distance )
  )

  const turnPlan = computed( () =>
    buildTurnPlan( props.selections.course, props.selections.distance )
  )

  const syncReviewDraft = () => {
    const nextStrokeCountSlots = strokeCountPlan.value.map( slot => {
      const existing = props.draft.strokeCountSlots.find(
        item =>
          item.lengthIndex === slot.lengthIndex &&
          item.fromM === slot.fromM &&
          item.toM === slot.toM
      )

      return {
        id: existing?.id ?? makeId(),
        lengthIndex: slot.lengthIndex,
        fromM: slot.fromM,
        toM: slot.toM,
        label: slot.label,
        count: existing?.count ?? null,
      }
    } )

    const nextBreathCountSlots = strokeCountPlan.value.map( slot => {
      const existing = props.draft.breathCountSlots.find(
        item =>
          item.lengthIndex === slot.lengthIndex &&
          item.fromM === slot.fromM &&
          item.toM === slot.toM
      )

      return {
        id: existing?.id ?? makeId(),
        lengthIndex: slot.lengthIndex,
        fromM: slot.fromM,
        toM: slot.toM,
        label: slot.label.replace( /^Count /, "Breaths " ),
        count: existing?.count ?? null,
      }
    } )

    const nextTurns = turnPlan.value.map( turn => {
      const existing = props.draft.turns.find( item => item.turnIndex === turn.turnIndex )

      return {
        turnIndex: turn.turnIndex,
        breakoutM: existing?.breakoutM ?? FIXED_BREAKOUT_M,
      }
    } )

    const sameStrokeShape =
      props.draft.strokeCountSlots.length === nextStrokeCountSlots.length &&
      props.draft.strokeCountSlots.every( ( slot, index ) => {
        const next = nextStrokeCountSlots[index]
        return !!next &&
          slot.lengthIndex === next.lengthIndex &&
          slot.fromM === next.fromM &&
          slot.toM === next.toM
      } )

    const sameBreathShape =
      props.draft.breathCountSlots.length === nextBreathCountSlots.length &&
      props.draft.breathCountSlots.every( ( slot, index ) => {
        const next = nextBreathCountSlots[index]
        return !!next &&
          slot.lengthIndex === next.lengthIndex &&
          slot.fromM === next.fromM &&
          slot.toM === next.toM
      } )

    const sameTurnShape =
      props.draft.turns.length === nextTurns.length &&
      props.draft.turns.every( ( row, index ) => {
        const next = nextTurns[index]
        return !!next && row.turnIndex === next.turnIndex
      } )

    if ( sameStrokeShape && sameBreathShape && sameTurnShape && props.draft.breakoutStartM === FIXED_BREAKOUT_M ) return

    updateDraft( next => {
      next.strokeCountSlots = nextStrokeCountSlots
      next.breathCountSlots = nextBreathCountSlots
      next.turns = nextTurns
      next.breakoutStartM = FIXED_BREAKOUT_M
    } )
  }

  watch(
    () => [ props.selections.course, props.selections.distance ],
    () => {
      syncReviewDraft()
    },
    { immediate: true }
  )

  const strokeCountRecords = computed<VideoTimerStrokeCountRecord[]>( () =>
    props.draft.strokeCountSlots.map( slot => ( {
      lengthIndex: slot.lengthIndex,
      fromM: slot.fromM,
      toM: slot.toM,
      count: slot.count,
    } ) )
  )

  const findMarkerTime = ( code: string, turnIndex: number | null = null ) =>
    sortedMarkers.value.find( marker =>
      marker.code === code &&
      ( turnIndex === null ? true : marker.turnIndex === turnIndex )
    )?.tMs ?? null

  const breathMarkerRecords = computed( () =>
    props.draft.breathMarkers
      .slice()
      .sort( ( a, b ) => a.tMs - b.tMs )
      .map( marker => {
        const segment = props.draft.strokeCountSlots.find( ( slot, index ) => {
          const startMs =
            slot.lengthIndex === 1
              ? props.startOffsetMs
              : findMarkerTime( "hit_pad", slot.lengthIndex - 1 )

          const endMs =
            slot.lengthIndex < props.draft.strokeCountSlots.length
              ? findMarkerTime( "hit_pad", slot.lengthIndex )
              : findMarkerTime( "finish_time" ) ?? findMarkerTime( "finish" )

          if ( startMs === null || endMs === null ) return false
          const isLast = index === props.draft.strokeCountSlots.length - 1
          return marker.tMs >= startMs && ( isLast ? marker.tMs <= endMs : marker.tMs < endMs )
        } ) ?? null

        return {
          id: marker.id,
          lengthIndex: segment?.lengthIndex ?? 0,
          fromM: segment?.fromM ?? 0,
          toM: segment?.toM ?? 0,
          tMs: marker.tMs,
        }
      } )
      .filter( marker => marker.lengthIndex > 0 )
  )

  const computedAnalysis = computed( () =>
    buildVideoTimerComputedAnalysis( {
      course: props.selections.course,
      distance: props.selections.distance,
      startOffsetMs: props.startOffsetMs,
      markers: sortedMarkers.value,
      analysis: {
        breakoutStartM: props.draft.breakoutStartM,
      },
      strokeCounts: strokeCountRecords.value,
      breathCounts: [],
      breathMarkers: breathMarkerRecords.value,
      turns: props.draft.turns,
    } )
  )

  const totalStrokeCount = computed( () => computedAnalysis.value.swimFree.totalStrokeCount )
  const totalBreathCount = computed( () => computedAnalysis.value.swimFree.totalBreathCount )

  const averageTurnMetrics = computed( () => {
    const rows = computedAnalysis.value.turns

    const avg = ( values: Array<number | null | undefined> ) => {
      const valid = values.filter( ( value ): value is number => typeof value === "number" && Number.isFinite( value ) )
      if ( !valid.length ) return null
      return valid.reduce( ( sum, value ) => sum + value, 0 ) / valid.length
    }

    return {
      fiveInMs: avg( rows.map( row => row.fiveInMs ) ),
      tenOutMs: avg( rows.map( row => row.tenOutMs ) ),
      breakoutM: avg( rows.map( row => row.breakoutM ) ),
      breakoutMs: avg( rows.map( row => row.breakoutMs ) ),
    }
  } )

  const canSave = computed( () => {
    if ( saving.value ) return false
    if ( !props.video?.id ) return false
    return true
  } )

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

    return "Failed to save session."
  }

  const saveSession = async () => {
    errorMsg.value = null
    savedId.value = null
    const swimmerId = props.swimmer?.id ?? null

    if ( !canSave.value ) {
      if ( !props.video?.id ) errorMsg.value = "Video not uploaded yet."
      return
    }

    saving.value = true

    try {
      const payload = {
        video: props.video,
        selections: props.selections,
        swimmerId,
        notes: props.notes ?? "",
        startOffsetMs: props.startOffsetMs,
        resultSwimmer: props.resultLink.resultSwimmer,
        resultCourse: props.resultLink.resultCourse,
        resultStroke: props.resultLink.resultStroke,
        resultDistance: props.resultLink.resultDistance,
        resultSeq: props.resultLink.resultSeq,
        resultDate: props.resultLink.resultDate,
        markers: sortedMarkers.value.map( marker => ( {
          type: marker.type,
          code: marker.code,
          label: marker.label,
          lengthIndex: marker.lengthIndex,
          turnIndex: marker.turnIndex,
          tMs: marker.tMs,
        } ) ),
        analysis: {
          breakoutStartM: props.draft.breakoutStartM,
        },
        strokeCounts: strokeCountRecords.value,
        breathMarkers: props.draft.breathMarkers
          .slice()
          .sort( ( a, b ) => a.tMs - b.tMs )
          .map( marker => ( {
            tMs: marker.tMs,
          } ) ),
        turns: props.draft.turns,
        computed: computedAnalysis.value,
      }

      const isUpdate = props.saveMode === "update" && props.sessionId
      const url = isUpdate
        ? `/api/competition/video-timer-sessions/${props.sessionId}`
        : "/api/competition/video-timer-session"

      const method = isUpdate ? "PUT" : "POST"

      const res = await $fetch<{ id: string }>( url, {
        method,
        body: payload,
      } )

      savedId.value = res.id
      emit( "saved", { sessionId: res.id } )
    } catch ( e: unknown ) {
      errorMsg.value = getErrorMessage( e )
    } finally {
      saving.value = false
    }
  }

  const primaryButtonLabel = computed( () => {
    if ( saving.value ) return props.saveMode === "update" ? "Updating…" : "Saving…"
    return props.saveMode === "update" ? "Update session" : "Save session"
  } )
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden select-none">
    <div class="flex-1 overflow-y-auto">
      <div class="flex flex-col items-center px-6 py-6">
        <div class="w-full max-w-6xl">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-lg font-semibold text-gray-900">Performance analysis</div>
              <div class="text-xs text-gray-500 mt-1">
                Course: {{ selections.course }} • Stroke: {{ selections.stroke }} • Distance: {{ selections.distance }}
              </div>
            </div>

            <button class="h-10 px-4 rounded-md bg-gray-200 text-gray-900" type="button" @click="emit('back')">
              Back
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div class="xl:col-span-1 space-y-4">
              <div class="rounded-xl border border-gray-200 bg-white p-4">
                <div class="text-sm font-semibold text-gray-800 mb-3">Summary</div>

                <div class="grid grid-cols-1 gap-3 text-sm">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-gray-600">Swimmer</span>
                    <span class="font-medium text-gray-900">{{ swimmer?.fullName ?? "—" }}</span>
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <span class="text-gray-600">Video</span>
                    <span class="font-medium text-gray-900 truncate">{{ video.originalName }}</span>
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <span class="text-gray-600">Official time</span>
                    <span class="font-medium text-gray-900">{{ formatRaceClockMs(computedAnalysis.finishTimeMs) }}</span>
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <span class="text-gray-600">Total stroke count</span>
                    <span class="font-medium text-gray-900">{{ totalStrokeCount ?? "—" }}</span>
                  </div>
                </div>
              </div>

              <details class="rounded-xl border border-gray-200 bg-white p-4" :open="!useCollapsedSections">
                <summary class="text-sm font-semibold text-gray-800 cursor-pointer">Lap</summary>

                <div class="mt-3" :class="useCollapsedSections ? 'overflow-auto max-h-[360px]' : 'overflow-x-auto'">
                  <table class="min-w-full text-sm">
                    <thead>
                      <tr class="border-b">
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">Segment</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">Split</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">Time</th>
                        <th class="py-2 text-left font-semibold text-gray-700">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in computedAnalysis.laps" :key="row.lengthIndex" class="border-b last:border-b-0">
                        <td class="py-2 pr-3 text-gray-900">{{ row.label }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(row.splitMs) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(row.cumulativeMs) }}</td>
                        <td class="py-2 text-gray-900">{{ formatPercent(row.pct) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </div>

            <div class="xl:col-span-2 space-y-4">
              <details class="rounded-xl border border-gray-200 bg-white p-4" :open="!useCollapsedSections">
                <summary class="text-sm font-semibold text-gray-800 cursor-pointer">Skills</summary>

                <div class="mt-4 space-y-4">
                  <div>
                    <div class="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Start</div>
                    <div class="overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b">
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">10m</th>
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">Breakout (m)</th>
                            <th class="py-2 text-left font-semibold text-gray-700">Breakout</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(computedAnalysis.start.tenMs) }}</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatNumber(FIXED_BREAKOUT_M, 1) }}</td>
                            <td class="py-2 text-gray-900">{{ formatRaceClockMs(computedAnalysis.start.breakoutMs) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div class="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Turns</div>
                    <div :class="useCollapsedSections ? 'overflow-auto max-h-[360px]' : 'overflow-x-auto'">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b">
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">Turn</th>
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">5m IN</th>
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">10m OUT</th>
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">Breakout (m)</th>
                            <th class="py-2 text-left font-semibold text-gray-700">Breakout</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in computedAnalysis.turns" :key="row.turnIndex" class="border-b">
                            <td class="py-2 pr-3 text-gray-900">{{ row.label }}</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(row.fiveInMs) }}</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(row.tenOutMs) }}</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatNumber(FIXED_BREAKOUT_M, 1) }}</td>
                            <td class="py-2 text-gray-900">{{ formatRaceClockMs(row.breakoutMs) }}</td>
                          </tr>

                          <tr v-if="computedAnalysis.turns.length">
                            <td class="py-2 pr-3 text-gray-900 font-medium">Average</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(averageTurnMetrics.fiveInMs) }}</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(averageTurnMetrics.tenOutMs) }}</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatNumber(averageTurnMetrics.breakoutM, 1) }}</td>
                            <td class="py-2 text-gray-900">{{ formatRaceClockMs(averageTurnMetrics.breakoutMs) }}</td>
                          </tr>

                          <tr v-else>
                            <td colspan="6" class="py-3 text-sm text-gray-500">No turns for this race.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div class="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Finish</div>
                    <div class="overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b">
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">5m IN</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(computedAnalysis.finish.fiveInMs) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </details>

              <details class="rounded-xl border border-gray-200 bg-white p-4" :open="!useCollapsedSections">
                <summary class="text-sm font-semibold text-gray-800 cursor-pointer">Swim free</summary>

                <div class="mt-3" :class="useCollapsedSections ? 'overflow-auto max-h-[420px]' : 'overflow-x-auto'">
                  <table class="min-w-full text-sm">
                    <thead>
                      <tr class="border-b">
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">Segment</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">Time</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">DPS</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">SR</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">Speed</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">Stroke count</th>
                        <th class="py-2 text-left font-semibold text-gray-700">Breath count</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in computedAnalysis.swimFree.rows" :key="row.lengthIndex" class="border-b">
                        <td class="py-2 pr-3 text-gray-900">{{ row.label }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(row.timeMs) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(row.dps) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(row.sr, 1) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(row.speed) }}</td>
                        <td class="py-2 pr-3 text-gray-900">
                          {{ props.draft.strokeCountSlots.find(slot => slot.lengthIndex === row.lengthIndex)?.count ?? "—" }}
                        </td>
                        <td class="py-2 text-gray-900">
                          {{ row.breathCount ?? "-" }}
                        </td>
                      </tr>

                      <tr class="border-b">
                        <td class="py-2 pr-3 text-gray-900 font-medium">Average</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(computedAnalysis.swimFree.averageTimeMs) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(computedAnalysis.swimFree.averageDps) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(computedAnalysis.swimFree.averageSr, 1) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(computedAnalysis.swimFree.averageSpeed) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(computedAnalysis.swimFree.averageStrokeCount, 1) }}</td>
                        <td class="py-2 text-gray-900">{{ formatNumber(computedAnalysis.swimFree.averageBreathCount, 1) }}</td>
                      </tr>

                      <tr>
                        <td class="py-2 pr-3 text-gray-900 font-medium">Total</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatRaceClockMs(computedAnalysis.finishTimeMs) }}</td>
                        <td class="py-2 pr-3 text-gray-900">—</td>
                        <td class="py-2 pr-3 text-gray-900">—</td>
                        <td class="py-2 pr-3 text-gray-900">—</td>
                        <td class="py-2 pr-3 text-gray-900">{{ totalStrokeCount ?? "—" }}</td>
                        <td class="py-2 text-gray-900">{{ totalBreathCount ?? "-" }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>

              <div v-if="notes" class="rounded-xl border border-gray-200 bg-white p-4">
                <div class="text-sm font-semibold text-gray-800 mb-2">Notes</div>
                <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ notes }}</div>
              </div>

              <div v-if="errorMsg" class="text-sm text-red-600">
                {{ errorMsg }}
              </div>

              <div v-if="savedId" class="text-sm text-green-700">
                Saved: {{ savedId }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t bg-white px-6 py-4">
      <div class="w-full max-w-6xl mx-auto flex gap-3">
        <button
          class="flex-1 h-12 rounded-md bg-green-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          type="button"
          :disabled="!canSave"
          @click="saveSession"
        >
          {{ primaryButtonLabel }}
        </button>

        <button class="h-12 px-4 rounded-md bg-gray-200 text-gray-900" type="button" @click="emit('back')">
          Back
        </button>
      </div>
    </div>
  </div>
</template>
