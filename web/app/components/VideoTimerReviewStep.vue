<script setup lang="ts">
  import type { Swimmer } from "lib"
  import { toRaw } from "vue"

  type MarkerType = "surfacing" | "split"

  type Marker = {
    id: string
    type: MarkerType
    code: string
    label: string
    tMs: number
  }

  type UploadedVideo = {
    id?: string
    playbackUrl: string
    originalName: string
    mimeType: string
    size: number
    durationMs?: number
  }

  type SwimmerRef = Swimmer | undefined

  type MarkerSlot = {
    id: string
    type: MarkerType
    code: string
    label: string
    videoMs: number | null
    missed: boolean
  }

  type VideoTimerDraft = {
    finishVideoMs: number | null
    startOffsetMs: number | null
    surfaceSlots: MarkerSlot[]
    splitSlots: MarkerSlot[]
    selectedSlotId: string | null
    markers: Marker[]
    strokeCount: number | null
    count10to50: number | null
    count60to100: number | null
    reactionSec: number | null
    breakoutStartM: number | null
    turnRotationSec: number | null
    breakoutTurnM: number | null
  }

  const props = defineProps<{
    video: UploadedVideo
    selections: { course: string; stroke: string; distance: string }
    swimmer: SwimmerRef
    meetId: string | null
    notes: string
    markers: Marker[]
    startOffsetMs: number | null
    strokeCount?: number | null
    resultLink: {
      resultSwimmer: string | null
      resultCourse: string | null
      resultStroke: string | null
      resultDistance: string | null
      resultSeq: string | null
      resultDate: string | null
    }
    draft: VideoTimerDraft
  }>()

  const emit = defineEmits<{
    ( e: "back" ): void
    ( e: "update:markers", v: Marker[] ): void
    ( e: "saved", payload: { sessionId: string } ): void
    ( e: "update:draft", v: VideoTimerDraft ): void
  }>()

  const saving = ref( false )
  const errorMsg = ref<string | null>( null )
  const savedId = ref<string | null>( null )

  const cloneDraft = () => structuredClone( toRaw( props.draft ) ) as VideoTimerDraft

  const updateDraft = ( updater: ( next: VideoTimerDraft ) => void ) => {
    const next = cloneDraft()
    updater( next )
    emit( "update:draft", next )
  }

  const toRaceMs = ( videoMs: number ) => {
    const s = props.startOffsetMs ?? 0
    return Math.max( 0, videoMs - s )
  }

  const toRaceSec = ( videoMs: number ) => toRaceMs( videoMs ) / 1000

  const sortedMarkers = computed( () => [ ...props.markers ].sort( ( a, b ) => a.tMs - b.tMs ) )

  const getMarkerByCode = ( ...codes: string[] ) => {
    for ( const code of codes ) {
      const found = sortedMarkers.value.find( m => m.code === code )
      if ( found ) return found
    }
    return null
  }

  const markerRaceSec = ( ...codes: string[] ) => {
    const marker = getMarkerByCode( ...codes )
    return marker ? toRaceSec( marker.tMs ) : null
  }

  const round2 = ( v: number ) => Math.round( v * 100 ) / 100
  const round1 = ( v: number ) => Math.round( v * 10 ) / 10

  const formatPercent = ( v: number | null | undefined ) => {
    if ( v === null || v === undefined || !Number.isFinite( v ) ) return "—"
    return `${round1( v ).toFixed( 1 )}%`
  }

  const formatNumber = ( v: number | null | undefined, decimals = 2 ) => {
    if ( v === null || v === undefined || !Number.isFinite( v ) ) return "—"
    return v.toFixed( decimals )
  }

  const formatRaceClock = ( v: number | null | undefined ) => {
    if ( v === null || v === undefined || !Number.isFinite( v ) ) return "—"
    const totalHundredths = Math.round( v * 100 )
    const totalSeconds = Math.floor( totalHundredths / 100 )
    const hundredths = totalHundredths % 100
    const minutes = Math.floor( totalSeconds / 60 )
    const seconds = totalSeconds % 60
    return `${String( minutes ).padStart( 2, "0" )}:${String( seconds ).padStart( 2, "0" )}.${String( hundredths ).padStart( 2, "0" )}`
  }

  const startBreakoutSec = computed( () => markerRaceSec( "breakout_start", "breakout" ) )
  const start10mSec = computed( () => markerRaceSec( "m10" ) )

  const hitPadSec = computed( () => markerRaceSec( "hit_pad" ) )
  const beforeTurn5Sec = computed( () => markerRaceSec( "before_turn_5", "turn_end_5" ) )
  const breakoutAfterTurnSec = computed( () => markerRaceSec( "breakout_after_turn" ) )
  const afterTurn10Sec = computed( () => markerRaceSec( "after_turn_10", "turn_end_10" ) )
  const beforeFinish5Sec = computed( () => markerRaceSec( "before_finish_5", "finish_end_5", "m5" ) )
  const finishTimeSec = computed( () => markerRaceSec( "finish_time", "finish" ) )

  const lap0to50SplitSec = computed( () => hitPadSec.value )
  const lap50to100SplitSec = computed( () => {
    if ( finishTimeSec.value === null || hitPadSec.value === null ) return null
    return round2( finishTimeSec.value - hitPadSec.value )
  } )

  const lapRows = computed( () => {
    const total = finishTimeSec.value
    const seg1Split = lap0to50SplitSec.value
    const seg2Split = lap50to100SplitSec.value

    return [
      {
        segment: "0 - 50 m",
        split: seg1Split,
        time: seg1Split,
        pct: total && seg1Split !== null ? ( seg1Split / total ) * 100 : null,
      },
      {
        segment: "50 - 100 m",
        split: seg2Split,
        time: total,
        pct: total && seg2Split !== null ? ( seg2Split / total ) * 100 : null,
      }
    ]
  } )

  const turn5InSec = computed( () => {
    if ( hitPadSec.value === null || beforeTurn5Sec.value === null ) return null
    return round2( hitPadSec.value - beforeTurn5Sec.value )
  } )

  const turn10Sec = computed( () => {
    if ( afterTurn10Sec.value === null || hitPadSec.value === null ) return null
    return round2( afterTurn10Sec.value - hitPadSec.value )
  } )

  const turnBreakoutSec = computed( () => {
    if ( breakoutAfterTurnSec.value === null || hitPadSec.value === null ) return null
    return round2( breakoutAfterTurnSec.value - hitPadSec.value )
  } )

  const finish5InSec = computed( () => {
    if ( finishTimeSec.value === null || beforeFinish5Sec.value === null ) return null
    return round2( finishTimeSec.value - beforeFinish5Sec.value )
  } )

  const free10to50TimeSec = computed( () => {
    if ( hitPadSec.value === null || start10mSec.value === null ) return null
    return round2( hitPadSec.value - start10mSec.value )
  } )

  const free60to100TimeSec = computed( () => {
    if ( finishTimeSec.value === null || afterTurn10Sec.value === null ) return null
    return round2( finishTimeSec.value - afterTurn10Sec.value )
  } )

  const calcSpeed = ( distanceM: number, timeSec: number | null ) => {
    if ( timeSec === null || timeSec <= 0 ) return null
    return round2( distanceM / timeSec )
  }

  const calcDps = ( distanceM: number, count: number | null ) => {
    if ( count === null || count <= 0 ) return null
    return round2( distanceM / count )
  }

  const calcSr = ( count: number | null, timeSec: number | null ) => {
    if ( count === null || count <= 0 || timeSec === null || timeSec <= 0 ) return null
    return round1( count / ( timeSec / 60 ) )
  }

  const free10to50Speed = computed( () => calcSpeed( 40, free10to50TimeSec.value ) )
  const free60to100Speed = computed( () => calcSpeed( 40, free60to100TimeSec.value ) )

  const free10to50Dps = computed( () => calcDps( 40, props.draft.count10to50 ) )
  const free60to100Dps = computed( () => calcDps( 40, props.draft.count60to100 ) )

  const free10to50Sr = computed( () => calcSr( props.draft.count10to50, free10to50TimeSec.value ) )
  const free60to100Sr = computed( () => calcSr( props.draft.count60to100, free60to100TimeSec.value ) )

  const totalCount = computed( () => {
    if ( props.draft.count10to50 !== null && props.draft.count60to100 !== null ) {
      return props.draft.count10to50 + props.draft.count60to100
    }
    return null
  } )

  const avgDps = computed( () => {
    const vals = [ free10to50Dps.value, free60to100Dps.value ].filter( ( v ): v is number => v !== null )
    if ( !vals.length ) return null
    return round2( vals.reduce( ( a, b ) => a + b, 0 ) / vals.length )
  } )

  const avgSr = computed( () => {
    const vals = [ free10to50Sr.value, free60to100Sr.value ].filter( ( v ): v is number => v !== null )
    if ( !vals.length ) return null
    return round2( vals.reduce( ( a, b ) => a + b, 0 ) / vals.length )
  } )

  const avgSpeed = computed( () => {
    const vals = [ free10to50Speed.value, free60to100Speed.value ].filter( ( v ): v is number => v !== null )
    if ( !vals.length ) return null
    return round2( vals.reduce( ( a, b ) => a + b, 0 ) / vals.length )
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
    const meetId = props.meetId ?? null

    if ( !canSave.value ) {
      if ( !props.video?.id ) errorMsg.value = "Video not uploaded yet."
      return
    }

    saving.value = true

    try {
      const res = await $fetch<{ id: string }>( "/api/competition/video-timer-session", {
        method: "POST",
        body: {
          video: props.video,
          selections: props.selections,
          swimmerId,
          meetId,
          notes: props.notes ?? "",
          startOffsetMs: props.startOffsetMs,
          resultSwimmer: props.resultLink.resultSwimmer,
          resultCourse: props.resultLink.resultCourse,
          resultStroke: props.resultLink.resultStroke,
          resultDistance: props.resultLink.resultDistance,
          resultSeq: props.resultLink.resultSeq,
          resultDate: props.resultLink.resultDate,
          markers: sortedMarkers.value.map( m => ( { type: m.type, code: m.code, label: m.label, tMs: m.tMs } ) ),
          analysis: {
            lap: {
              rows: lapRows.value,
            },
            skills: {
              start: {
                reactionSec: props.draft.reactionSec,
                tenMsec: start10mSec.value,
                breakoutM: props.draft.breakoutStartM,
                breakoutSec: startBreakoutSec.value,
              },
              turns: [
                {
                  turn: "50 m",
                  fiveMinSec: turn5InSec.value,
                  rotationSec: props.draft.turnRotationSec,
                  tenMsec: turn10Sec.value,
                  breakoutM: props.draft.breakoutTurnM,
                  breakoutSec: turnBreakoutSec.value,
                }
              ],
              finish: {
                fiveMinSec: finish5InSec.value,
              }
            },
            freeSwim: {
              segment10to50: {
                timeSec: free10to50TimeSec.value,
                dpsM: free10to50Dps.value,
                srStrMin: free10to50Sr.value,
                speedMs: free10to50Speed.value,
                count: props.draft.count10to50,
              },
              segment60to100: {
                timeSec: free60to100TimeSec.value,
                dpsM: free60to100Dps.value,
                srStrMin: free60to100Sr.value,
                speedMs: free60to100Speed.value,
                count: props.draft.count60to100,
              },
              average: {
                dpsM: avgDps.value,
                srStrMin: avgSr.value,
                speedMs: avgSpeed.value,
              },
              total: {
                timeSec: finishTimeSec.value,
                count: totalCount.value,
              }
            }
          }
        }
      } )
      savedId.value = res.id
      emit( "saved", { sessionId: res.id } )
    } catch ( e: unknown ) {
      errorMsg.value = getErrorMessage( e )
    } finally {
      saving.value = false
    }
  }
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
                    <span class="font-medium text-gray-900">{{ formatRaceClock(finishTimeSec) }}</span>
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <span class="text-gray-600">Total stroke count</span>
                    <span class="font-medium text-gray-900">{{ totalCount ?? "—" }}</span>
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-gray-200 bg-white p-4">
                <div class="text-sm font-semibold text-gray-800 mb-3">LAP</div>

                <div class="overflow-x-auto">
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
                      <tr v-for="row in lapRows" :key="row.segment" class="border-b last:border-b-0">
                        <td class="py-2 pr-3 text-gray-900">{{ row.segment }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(row.split) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(row.time) }}</td>
                        <td class="py-2 text-gray-900">{{ formatPercent(row.pct) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="xl:col-span-2 space-y-4">
              <div class="rounded-xl border border-gray-200 bg-white p-4">
                <div class="text-sm font-semibold text-gray-800 mb-3">Skills</div>

                <div class="space-y-4">
                  <div>
                    <div class="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Start</div>
                    <div class="overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b">
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">Reaction</th>
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">10m (sec)</th>
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">Breakout (m)</th>
                            <th class="py-2 text-left font-semibold text-gray-700">Breakout (sec)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td class="py-2 pr-3">
                              <input
                                :value="props.draft.reactionSec ?? ''"
                                class="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                                type="number"
                                min="0"
                                step="0.01"
                                @input="updateDraft((next) => { next.reactionSec = Number(($event.target as HTMLInputElement).value) || null })"
                              >
                            </td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(start10mSec) }}</td>
                            <td class="py-2 pr-3">
                              <input
                                :value="props.draft.breakoutStartM ?? ''"
                                class="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                                type="number"
                                min="0"
                                step="0.1"
                                @input="updateDraft((next) => { next.breakoutStartM = Number(($event.target as HTMLInputElement).value) || null })"
                              >
                            </td>
                            <td class="py-2 text-gray-900">{{ formatRaceClock(startBreakoutSec) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div class="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Turns</div>
                    <div class="overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b">
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">Turn</th>
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">5m IN (sec)</th>
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">Rotation (sec)</th>
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">10m (sec)</th>
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">Breakout (m)</th>
                            <th class="py-2 text-left font-semibold text-gray-700">Breakout (sec)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr class="border-b">
                            <td class="py-2 pr-3 text-gray-900">50 m</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(turn5InSec) }}</td>
                            <td class="py-2 pr-3">
                              <input
                                :value="props.draft.turnRotationSec ?? ''"
                                class="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                                type="number"
                                min="0"
                                step="0.01"
                                @input="updateDraft((next) => { next.turnRotationSec = Number(($event.target as HTMLInputElement).value) || null })"
                              >
                            </td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(turn10Sec) }}</td>
                            <td class="py-2 pr-3">
                              <input
                                :value="props.draft.breakoutTurnM ?? ''"
                                class="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                                type="number"
                                min="0"
                                step="0.1"
                                @input="updateDraft((next) => { next.breakoutTurnM = Number(($event.target as HTMLInputElement).value) || null })"
                              >
                            </td>
                            <td class="py-2 text-gray-900">{{ formatRaceClock(turnBreakoutSec) }}</td>
                          </tr>
                          <tr>
                            <td class="py-2 pr-3 text-gray-900 font-medium">Average</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(turn5InSec) }}</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(props.draft.turnRotationSec) }}</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(turn10Sec) }}</td>
                            <td class="py-2 pr-3 text-gray-900">{{ formatNumber(props.draft.breakoutTurnM, 1) }}</td>
                            <td class="py-2 text-gray-900">{{ formatRaceClock(turnBreakoutSec) }}</td>
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
                            <th class="py-2 pr-3 text-left font-semibold text-gray-700">5m IN (sec)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(finish5InSec) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-gray-200 bg-white p-4">
                <div class="text-sm font-semibold text-gray-800 mb-3">Swim free</div>

                <div class="overflow-x-auto">
                  <table class="min-w-full text-sm">
                    <thead>
                      <tr class="border-b">
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">Segments</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">Time (sec)</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">DPS (m)</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">SR (str/Min)</th>
                        <th class="py-2 pr-3 text-left font-semibold text-gray-700">Speed (m/s)</th>
                        <th class="py-2 text-left font-semibold text-gray-700">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="border-b">
                        <td class="py-2 pr-3 text-gray-900">10 - 50 m</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(free10to50TimeSec) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(free10to50Dps) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(free10to50Sr, 1) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(free10to50Speed) }}</td>
                        <td class="py-2">
                          <input
                            :value="props.draft.count10to50 ?? ''"
                            class="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                            type="number"
                            min="0"
                            step="1"
                            @input="updateDraft((next) => { next.count10to50 = Number(($event.target as HTMLInputElement).value) || null })"
                          >
                        </td>
                      </tr>

                      <tr class="border-b">
                        <td class="py-2 pr-3 text-gray-900">60 - 100 m</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(free60to100TimeSec) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(free60to100Dps) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(free60to100Sr, 1) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(free60to100Speed) }}</td>
                        <td class="py-2">
                          <input
                            :value="props.draft.count60to100 ?? ''"
                            class="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                            type="number"
                            min="0"
                            step="1"
                            @input="updateDraft((next) => { next.count60to100 = Number(($event.target as HTMLInputElement).value) || null })"
                          >
                        </td>
                      </tr>

                      <tr class="border-b">
                        <td class="py-2 pr-3 text-gray-900 font-medium">Average</td>
                        <td class="py-2 pr-3 text-gray-900">—</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(avgDps) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(avgSr, 2) }}</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatNumber(avgSpeed) }}</td>
                        <td class="py-2 text-gray-900">—</td>
                      </tr>

                      <tr>
                        <td class="py-2 pr-3 text-gray-900 font-medium">Total</td>
                        <td class="py-2 pr-3 text-gray-900">{{ formatRaceClock(finishTimeSec) }}</td>
                        <td class="py-2 pr-3 text-gray-900">—</td>
                        <td class="py-2 pr-3 text-gray-900">—</td>
                        <td class="py-2 pr-3 text-gray-900">—</td>
                        <td class="py-2 text-gray-900">{{ totalCount ?? "—" }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

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
          {{ saving ? "Saving…" : "Save session" }}
        </button>

        <button class="h-12 px-4 rounded-md bg-gray-200 text-gray-900" type="button" @click="emit('back')">
          Back
        </button>
      </div>
    </div>
  </div>
</template>