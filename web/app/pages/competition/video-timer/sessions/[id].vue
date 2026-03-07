<script setup lang="ts">
  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Video Timer Session",
  } )

  type MarkerType = "surfacing" | "split"

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
      id: string
      playbackUrl: string
      originalName: string
      mimeType: string
      size: number
      durationMs?: number
    }
    markers: {
      id: string
      type: MarkerType
      code: string
      label: string
      tMs: number
    }[]
    analysis: {
      count10to50: number | null
      count60to100: number | null
      reactionMs: number | null
      breakoutStartM: number | null
      turnRotationMs: number | null
      breakoutTurnM: number | null
    } | null
  }

  type TabKey = "analysis" | "video" | "markers"

  const route = useRoute()
  const sessionId = computed( () => String( route.params.id ?? "" ) )
  const activeTab = ref<TabKey>( "analysis" )

  const { data, pending, error, refresh } = await useAsyncData(
    () => `video-timer-session-${sessionId.value}`,
    () => $fetch<SessionDetail>( `/api/competition/video-timer-sessions/${sessionId.value}` ),
    { watch: [ sessionId ] }
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

  const formatRaceMs = ( ms: number | null | undefined ) => {
    if ( ms === null || ms === undefined || !Number.isFinite( ms ) ) return "—"
    const totalMs = Math.max( 0, Math.round( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const minutes = Math.floor( totalSeconds / 60 )
    const seconds = String( totalSeconds % 60 ).padStart( 2, "0" )
    const centiseconds = String( Math.floor( ( totalMs % 1000 ) / 10 ) ).padStart( 2, "0" )
    return `${minutes}:${seconds}.${centiseconds}`
  }

  const formatVideoMs = ( ms: number | null | undefined ) => {
    if ( ms === null || ms === undefined || !Number.isFinite( ms ) ) return "—"
    const totalMs = Math.max( 0, Math.round( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const minutes = Math.floor( totalSeconds / 60 )
    const seconds = String( totalSeconds % 60 ).padStart( 2, "0" )
    const millis = String( totalMs % 1000 ).padStart( 3, "0" )
    return `${minutes}:${seconds}.${millis}`
  }

  const formatNumber = ( value: number | null | undefined, digits = 2 ) => {
    if ( value === null || value === undefined || !Number.isFinite( value ) ) return "—"
    return value.toFixed( digits )
  }

  const formatPercent = ( value: number | null | undefined ) => {
    if ( value === null || value === undefined || !Number.isFinite( value ) ) return "—"
    return `${value.toFixed( 1 )}%`
  }

  const markerMap = computed<Record<string, SessionDetail["markers"][number]>>( () => {
    const out: Record<string, SessionDetail["markers"][number]> = {}
    for ( const marker of data.value?.markers ?? [] ) {
      out[marker.code] = marker
    }
    return out
  } )

  const raceMsFromVideoMs = ( videoMs: number | null | undefined ) => {
    if ( videoMs === null || videoMs === undefined ) return null
    if ( data.value?.startOffsetMs === null || data.value?.startOffsetMs === undefined ) return null
    return Math.max( 0, videoMs - data.value.startOffsetMs )
  }

  const raceMsByCode = ( code: string ) => raceMsFromVideoMs( markerMap.value[code]?.tMs ?? null )

  const deltaMs = ( endMs: number | null, startMs: number | null ) => {
    if ( endMs === null || startMs === null ) return null
    return Math.max( 0, endMs - startMs )
  }

  const speedMps = ( distanceM: number, timeMs: number | null ) => {
    if ( timeMs === null || timeMs <= 0 ) return null
    return distanceM / ( timeMs / 1000 )
  }

  const dps = ( distanceM: number, count: number | null | undefined ) => {
    if ( count === null || count === undefined || count <= 0 ) return null
    return distanceM / count
  }

  const sr = ( count: number | null | undefined, timeMs: number | null ) => {
    if ( count === null || count === undefined || count <= 0 || timeMs === null || timeMs <= 0 ) return null
    return count / ( timeMs / 60000 )
  }

  const average = ( values: Array<number | null | undefined> ) => {
    const filtered = values.filter( ( value ): value is number => value !== null && value !== undefined && Number.isFinite( value ) )
    if ( !filtered.length ) return null
    return filtered.reduce( ( sum, value ) => sum + value, 0 ) / filtered.length
  }

  const finishRaceMs = computed( () => raceMsByCode( "finish_time" ) )
  const hitPadRaceMs = computed( () => raceMsByCode( "hit_pad" ) )
  const m10RaceMs = computed( () => raceMsByCode( "m10" ) )
  const beforeTurn5RaceMs = computed( () => raceMsByCode( "before_turn_5" ) )
  const afterTurn10RaceMs = computed( () => raceMsByCode( "after_turn_10" ) )
  const beforeFinish5RaceMs = computed( () => raceMsByCode( "before_finish_5" ) )
  const breakoutStartRaceMs = computed( () => raceMsByCode( "breakout_start" ) )
  const breakoutAfterTurnRaceMs = computed( () => raceMsByCode( "breakout_after_turn" ) )

  const lap0to50Ms = computed( () => hitPadRaceMs.value )
  const lap50to100Ms = computed( () => deltaMs( finishRaceMs.value, hitPadRaceMs.value ) )
  const lap0to50Pct = computed( () => finishRaceMs.value ? ( ( lap0to50Ms.value ?? 0 ) / finishRaceMs.value ) * 100 : null )
  const lap50to100Pct = computed( () => finishRaceMs.value ? ( ( lap50to100Ms.value ?? 0 ) / finishRaceMs.value ) * 100 : null )

  const turn5InMs = computed( () => deltaMs( hitPadRaceMs.value, beforeTurn5RaceMs.value ) )
  const turn10OutMs = computed( () => deltaMs( afterTurn10RaceMs.value, hitPadRaceMs.value ) )
  const turnBreakoutMs = computed( () => deltaMs( breakoutAfterTurnRaceMs.value, hitPadRaceMs.value ) )
  const finish5InMs = computed( () => deltaMs( finishRaceMs.value, beforeFinish5RaceMs.value ) )

  const free10to50TimeMs = computed( () => deltaMs( hitPadRaceMs.value, m10RaceMs.value ) )
  const free60to100TimeMs = computed( () => deltaMs( finishRaceMs.value, afterTurn10RaceMs.value ) )

  const count10to50 = computed( () => data.value?.analysis?.count10to50 ?? null )
  const count60to100 = computed( () => data.value?.analysis?.count60to100 ?? null )

  const free10to50Speed = computed( () => speedMps( 40, free10to50TimeMs.value ) )
  const free60to100Speed = computed( () => speedMps( 40, free60to100TimeMs.value ) )
  const free10to50Dps = computed( () => dps( 40, count10to50.value ) )
  const free60to100Dps = computed( () => dps( 40, count60to100.value ) )
  const free10to50Sr = computed( () => sr( count10to50.value, free10to50TimeMs.value ) )
  const free60to100Sr = computed( () => sr( count60to100.value, free60to100TimeMs.value ) )

  const totalStrokeCount = computed( () => {
    const first = count10to50.value
    const second = count60to100.value
    if ( first === null && second === null ) return null
    return ( first ?? 0 ) + ( second ?? 0 )
  } )

  const averageSpeed = computed( () => average( [ free10to50Speed.value, free60to100Speed.value ] ) )
  const averageDps = computed( () => average( [ free10to50Dps.value, free60to100Dps.value ] ) )
  const averageSr = computed( () => average( [ free10to50Sr.value, free60to100Sr.value ] ) )

  const titleText = computed( () => {
    const selections = data.value?.selections
    if ( !selections ) return "Session"
    return `${selections.distance} ${selections.stroke} (${String( selections.course || "" ).toUpperCase()})`
  } )

  const tabClass = ( key: TabKey ) =>
    activeTab.value === key
      ? "border-blue-600 text-blue-700"
      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-6xl mx-auto px-6 py-6">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-lg font-semibold text-gray-900">Video Timer Session</div>
            <div class="text-xs text-gray-500 mt-1">
              Review saved video, markers and analysis.
            </div>
          </div>

          <div class="flex gap-2">
            <NuxtLink class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center" to="/competition/video-timer/sessions">
              Back to sessions
            </NuxtLink>
            <button class="h-10 px-4 rounded-md bg-gray-900 text-white" type="button" @click="refresh()">
              Refresh
            </button>
          </div>
        </div>

        <div v-if="pending" class="mt-6 text-sm text-gray-600">
          Loading…
        </div>

        <div v-else-if="error" class="mt-6 text-sm text-red-600">
          Failed to load session.
        </div>

        <div v-else-if="data" class="mt-6">
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="text-lg font-semibold text-gray-900">
                  {{ titleText }}
                </div>
                <div v-if="data.swimmer?.fullName" class="text-sm text-gray-700 mt-1">
                  {{ data.swimmer.fullName }}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ formatDate(data.createdAt) }}
                  <span v-if="data.meet?.name"> • {{ data.meet.name }}</span>
                  <span v-if="data.video.originalName"> • {{ data.video.originalName }}</span>
                  <span> • {{ data.markers.length }} markers</span>
                </div>
              </div>

              <div class="text-xs text-gray-500">
                <div>Course: <span class="font-semibold text-gray-700">{{ data.selections.course }}</span></div>
                <div>Stroke: <span class="font-semibold text-gray-700">{{ data.selections.stroke }}</span></div>
                <div>Distance: <span class="font-semibold text-gray-700">{{ data.selections.distance }}</span></div>
              </div>
            </div>

            <div class="mt-4 border-b border-gray-200">
              <nav class="flex gap-6">
                <button
                  class="border-b-2 pb-3 text-sm font-semibold transition-colors"
                  :class="tabClass('analysis')"
                  type="button"
                  @click="activeTab = 'analysis'"
                >
                  Analysis
                </button>

                <button
                  class="border-b-2 pb-3 text-sm font-semibold transition-colors"
                  :class="tabClass('video')"
                  type="button"
                  @click="activeTab = 'video'"
                >
                  Video
                </button>

                <button
                  class="border-b-2 pb-3 text-sm font-semibold transition-colors"
                  :class="tabClass('markers')"
                  type="button"
                  @click="activeTab = 'markers'"
                >
                  Markers
                </button>
              </nav>
            </div>

            <div v-if="activeTab === 'analysis'" class="mt-4 grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
              <div class="space-y-4">
                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Summary</div>

                  <div class="mt-4 space-y-3 text-sm">
                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Swimmer</div>
                      <div class="text-right text-gray-900 font-medium">{{ data.swimmer?.fullName || "—" }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Video</div>
                      <div class="text-right text-gray-900 font-medium break-all">{{ data.video.originalName || "—" }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Official time</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatRaceMs(finishRaceMs) }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Total stroke count</div>
                      <div class="text-right text-gray-900 font-medium">{{ totalStrokeCount ?? "—" }}</div>
                    </div>
                  </div>
                </div>

                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">LAP</div>

                  <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                      <thead>
                        <tr class="border-b border-gray-200 text-left text-gray-500">
                          <th class="py-2 pr-4 font-semibold">Segment</th>
                          <th class="py-2 pr-4 font-semibold">Split</th>
                          <th class="py-2 pr-4 font-semibold">Time</th>
                          <th class="py-2 font-semibold">%</th>
                        </tr>
                      </thead>
                      <tbody class="text-gray-900">
                        <tr class="border-b border-gray-100">
                          <td class="py-2 pr-4">0 - 50 m</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(lap0to50Ms) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(hitPadRaceMs) }}</td>
                          <td class="py-2 tabular-nums">{{ formatPercent(lap0to50Pct) }}</td>
                        </tr>
                        <tr>
                          <td class="py-2 pr-4">50 - 100 m</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(lap50to100Ms) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(finishRaceMs) }}</td>
                          <td class="py-2 tabular-nums">{{ formatPercent(lap50to100Pct) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Skills</div>

                  <div class="mt-4">
                    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Start</div>

                    <div class="mt-2 overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b border-gray-200 text-left text-gray-500">
                            <th class="py-2 pr-4 font-semibold">Reaction</th>
                            <th class="py-2 pr-4 font-semibold">10m (sec)</th>
                            <th class="py-2 pr-4 font-semibold">Breakout (m)</th>
                            <th class="py-2 font-semibold">Breakout (sec)</th>
                          </tr>
                        </thead>
                        <tbody class="text-gray-900">
                          <tr>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(data.analysis?.reactionMs) }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(m10RaceMs) }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatNumber(data.analysis?.breakoutStartM) }}</td>
                            <td class="py-2 tabular-nums">{{ formatRaceMs(breakoutStartRaceMs) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div class="mt-6">
                    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Turns</div>

                    <div class="mt-2 overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b border-gray-200 text-left text-gray-500">
                            <th class="py-2 pr-4 font-semibold">Turn</th>
                            <th class="py-2 pr-4 font-semibold">5m IN (sec)</th>
                            <th class="py-2 pr-4 font-semibold">Rotation (sec)</th>
                            <th class="py-2 pr-4 font-semibold">10m (sec)</th>
                            <th class="py-2 pr-4 font-semibold">Breakout (m)</th>
                            <th class="py-2 font-semibold">Breakout (sec)</th>
                          </tr>
                        </thead>
                        <tbody class="text-gray-900">
                          <tr class="border-b border-gray-100">
                            <td class="py-2 pr-4">50 m</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(turn5InMs) }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(data.analysis?.turnRotationMs) }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(turn10OutMs) }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatNumber(data.analysis?.breakoutTurnM) }}</td>
                            <td class="py-2 tabular-nums">{{ formatRaceMs(turnBreakoutMs) }}</td>
                          </tr>
                          <tr>
                            <td class="py-2 pr-4 font-medium">Average</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(turn5InMs) }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(data.analysis?.turnRotationMs) }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(turn10OutMs) }}</td>
                            <td class="py-2 pr-4 tabular-nums">{{ formatNumber(data.analysis?.breakoutTurnM) }}</td>
                            <td class="py-2 tabular-nums">{{ formatRaceMs(turnBreakoutMs) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div class="mt-6">
                    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Finish</div>

                    <div class="mt-2 overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr class="border-b border-gray-200 text-left text-gray-500">
                            <th class="py-2 pr-4 font-semibold">5m IN (sec)</th>
                          </tr>
                        </thead>
                        <tbody class="text-gray-900">
                          <tr>
                            <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(finish5InMs) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Swim free</div>

                  <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                      <thead>
                        <tr class="border-b border-gray-200 text-left text-gray-500">
                          <th class="py-2 pr-4 font-semibold">Segment</th>
                          <th class="py-2 pr-4 font-semibold">Time (sec)</th>
                          <th class="py-2 pr-4 font-semibold">DPS (m)</th>
                          <th class="py-2 pr-4 font-semibold">SR (str/Min)</th>
                          <th class="py-2 pr-4 font-semibold">Speed (m/s)</th>
                          <th class="py-2 font-semibold">Count</th>
                        </tr>
                      </thead>
                      <tbody class="text-gray-900">
                        <tr class="border-b border-gray-100">
                          <td class="py-2 pr-4">10 - 50 m</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(free10to50TimeMs) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(free10to50Dps) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(free10to50Sr, 1) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(free10to50Speed) }}</td>
                          <td class="py-2 tabular-nums">{{ count10to50 ?? "—" }}</td>
                        </tr>

                        <tr class="border-b border-gray-100">
                          <td class="py-2 pr-4">60 - 100 m</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(free60to100TimeMs) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(free60to100Dps) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(free60to100Sr, 1) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(free60to100Speed) }}</td>
                          <td class="py-2 tabular-nums">{{ count60to100 ?? "—" }}</td>
                        </tr>

                        <tr class="border-b border-gray-100">
                          <td class="py-2 pr-4 font-medium">Average</td>
                          <td class="py-2 pr-4 tabular-nums">—</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(averageDps) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(averageSr, 1) }}</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatNumber(averageSpeed) }}</td>
                          <td class="py-2 tabular-nums">—</td>
                        </tr>

                        <tr>
                          <td class="py-2 pr-4 font-medium">Total</td>
                          <td class="py-2 pr-4 tabular-nums">{{ formatRaceMs(finishRaceMs) }}</td>
                          <td class="py-2 pr-4 tabular-nums">—</td>
                          <td class="py-2 pr-4 tabular-nums">—</td>
                          <td class="py-2 pr-4 tabular-nums">—</td>
                          <td class="py-2 tabular-nums">{{ totalStrokeCount ?? "—" }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-if="data.notes" class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Notes</div>
                  <div class="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {{ data.notes }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="activeTab === 'video'" class="mt-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
              <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div class="p-4 text-sm font-semibold text-gray-900">
                  Video
                </div>

                <div class="bg-black">
                  <video
                    :src="data.video.playbackUrl"
                    controls
                    playsinline
                    preload="metadata"
                    class="w-full max-h-[72vh] bg-black"
                  />
                </div>
              </div>

              <div class="space-y-4">
                <div class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Session details</div>

                  <div class="mt-4 space-y-3 text-sm">
                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Swimmer</div>
                      <div class="text-right text-gray-900 font-medium">{{ data.swimmer?.fullName || "—" }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Meet</div>
                      <div class="text-right text-gray-900 font-medium">{{ data.meet?.name || "—" }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Created</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatDate(data.createdAt) }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Video duration</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatRaceMs(data.video.durationMs ?? null) }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Start offset</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatVideoMs(data.startOffsetMs) }}</div>
                    </div>

                    <div class="flex items-start justify-between gap-4">
                      <div class="text-gray-500">Official time</div>
                      <div class="text-right text-gray-900 font-medium">{{ formatRaceMs(finishRaceMs) }}</div>
                    </div>
                  </div>
                </div>

                <div v-if="data.notes" class="rounded-xl border border-gray-200 bg-white p-4">
                  <div class="text-sm font-semibold text-gray-900">Notes</div>
                  <div class="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {{ data.notes }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div class="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <div class="text-sm font-semibold text-gray-900">Markers</div>
                <div class="text-xs text-gray-500">{{ data.markers.length }} markers</div>
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-200 text-left text-gray-500">
                      <th class="px-4 py-3 font-semibold">#</th>
                      <th class="px-4 py-3 font-semibold">Label</th>
                      <th class="px-4 py-3 font-semibold">Code</th>
                      <th class="px-4 py-3 font-semibold">Type</th>
                      <th class="px-4 py-3 font-semibold">Video time</th>
                      <th class="px-4 py-3 font-semibold">Race time</th>
                    </tr>
                  </thead>
                  <tbody class="text-gray-900">
                    <tr
                      v-for="(marker, index) in data.markers"
                      :key="marker.id"
                      class="border-b border-gray-100 last:border-b-0"
                    >
                      <td class="px-4 py-3 tabular-nums">{{ index + 1 }}</td>
                      <td class="px-4 py-3 font-medium">{{ marker.label }}</td>
                      <td class="px-4 py-3 text-gray-600">{{ marker.code }}</td>
                      <td class="px-4 py-3 capitalize">{{ marker.type }}</td>
                      <td class="px-4 py-3 tabular-nums">{{ formatVideoMs(marker.tMs) }}</td>
                      <td class="px-4 py-3 tabular-nums">{{ formatRaceMs(raceMsFromVideoMs(marker.tMs)) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="mt-6 text-sm text-gray-600">
          Session not found.
        </div>
      </div>
    </div>
  </div>
</template>