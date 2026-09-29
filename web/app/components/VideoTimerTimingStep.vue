<script setup lang="ts">
  import type { PropType } from "vue"
  import {
    buildSplitMarkerPlan,
    buildStrokeCountSlots,
    buildSurfaceMarkerPlan,
    buildTurnPlan,
    type MarkerPlanItem,
    type MarkerType,
    type VideoTimerDraft,
    type VideoTimerMarkerRecord,
    type VideoTimerTurnAnalysisRecord,
    type StrokeCountSlot as PlanStrokeCountSlot,
  } from "lib"


  type UploadedVideo = {
    id?: string
    playbackUrl: string
    originalName: string
    mimeType: string
    size: number
    durationMs?: number
  }

  type SwimmerRef = Record<string, unknown> | null

  type MarkerSlot = VideoTimerDraft["surfaceSlots"][number]
  type StrokeCountSlot = VideoTimerDraft["strokeCountSlots"][number]
  type BreathCountSlot = VideoTimerDraft["breathCountSlots"][number]
  type TimingPanelTab = "markers" | "counts"
  type MarkerPanelTab = "surfacing" | "split" | "stroke" | "breath"

  type TurnPlanItem = ReturnType<typeof buildTurnPlan>[number]

  const strokesWithoutBreathMarkers = new Set( [ "backstroke", "breaststroke" ] )
  const allowsBreathMarkersForStroke = ( stroke: string ) => !strokesWithoutBreathMarkers.has( stroke )

  const props = defineProps( {
    video: { type: Object as PropType<UploadedVideo>, required: true },
    selections: { type: Object as PropType<{ course: string; stroke: string; distance: string }>, required: true },
    swimmer: { type: Object as PropType<SwimmerRef>, required: false, default: null },
    notes: { type: String, required: false, default: "" },
    initialOfficialFinishTime: { type: String, required: false, default: "" },
    resultLink: { type: Object as PropType<Record<string, string | null>>, required: true },
    draft: { type: Object as PropType<VideoTimerDraft>, required: true },
    mode: { type: String as PropType<"create" | "edit">, required: false, default: "create" },
    saveStatus: { type: String as PropType<"idle" | "saving" | "saved" | "error">, required: false, default: undefined },
  } )

  const emit = defineEmits<{
    ( e: "back" ): void
    ( e: "stop", payload: { markers: VideoTimerMarkerRecord[] } ): void
    ( e: "update:draft", v: VideoTimerDraft ): void
  }>()

  const makeId = () => {
    const c = globalThis.crypto as Crypto | undefined
    if ( c?.randomUUID ) return c.randomUUID()
    return `${Date.now()}-${Math.random().toString( 16 ).slice( 2 )}`
  }

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
    strokeMarkers: ( props.draft.strokeMarkers ?? [] ).map( marker => ( {
      id: marker.id,
      tMs: marker.tMs,
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

  const buildSurfacePlan = (): MarkerPlanItem[] =>
    buildSurfaceMarkerPlan( props.selections.course, props.selections.distance ) ?? []

  const buildSplitPlan = (): MarkerPlanItem[] => {
    const raw = buildSplitMarkerPlan( props.selections.course, props.selections.distance ) ?? []
    const filtered = raw.filter( item => item.code !== "finish" )
    if ( filtered.some( item => item.code === "finish_time" ) ) return filtered
    return [ ...filtered, { seq: filtered.length + 1, type: "split", code: "finish_time", label: "Finish time", lengthIndex: null, turnIndex: null } ]
  }

  const buildStrokeCountPlan = (): PlanStrokeCountSlot[] =>
    buildStrokeCountSlots( props.selections.course, props.selections.distance ) ?? []

  const buildTurnsPlan = (): TurnPlanItem[] =>
    buildTurnPlan( props.selections.course, props.selections.distance ) ?? []

  const markerPlanKey = ( item: Pick<MarkerPlanItem, "type" | "code" | "lengthIndex" | "turnIndex"> ) =>
    `${item.type}::${item.code}::${item.lengthIndex ?? "x"}::${item.turnIndex ?? "x"}`

  const markerRecordKey = ( item: Pick<VideoTimerMarkerRecord, "type" | "code" | "lengthIndex" | "turnIndex"> ) =>
    `${item.type}::${item.code}::${item.lengthIndex ?? "x"}::${item.turnIndex ?? "x"}`

  const strokePlanKey = ( item: Pick<PlanStrokeCountSlot, "lengthIndex" | "fromM" | "toM"> ) =>
    `${item.lengthIndex}::${item.fromM}::${item.toM}`

  const getSavedFinishVideoMs = () =>
    props.draft.finishVideoMs ??
    props.draft.markers.find( marker => marker.code === "finish_time" || marker.code === "finish" )?.tMs ??
    null

  const makeMarkerSlotsFromPlan = (
    items: MarkerPlanItem[],
    currentSlots: MarkerSlot[],
    savedMarkers: VideoTimerMarkerRecord[]
  ): MarkerSlot[] =>
    items.map( item => {
      const existing = currentSlots.find( slot => markerPlanKey( slot ) === markerPlanKey( item ) )
      const saved = savedMarkers.find( marker => markerRecordKey( marker ) === markerPlanKey( item ) ) ?? null

      return {
        id: existing?.id ?? makeId(),
        seq: item.seq,
        type: item.type,
        code: item.code,
        label: item.label,
        lengthIndex: item.lengthIndex,
        turnIndex: item.turnIndex,
        videoMs: existing?.videoMs ?? saved?.tMs ?? ( item.code === "finish_time" ? getSavedFinishVideoMs() : null ),
        missed: existing?.missed ?? false,
      }
    } )
  const makeStrokeCountDraftSlots = ( items: PlanStrokeCountSlot[], currentSlots: StrokeCountSlot[] ): StrokeCountSlot[] =>
    items.map( item => {
      const existing = currentSlots.find( slot => strokePlanKey( slot ) === strokePlanKey( item ) )

      return {
        id: existing?.id ?? makeId(),
        lengthIndex: item.lengthIndex,
        fromM: item.fromM,
        toM: item.toM,
        label: item.label,
        count: existing?.count ?? null,
      }
    } )

  const makeBreathCountDraftSlots = ( items: PlanStrokeCountSlot[], currentSlots: BreathCountSlot[] ): BreathCountSlot[] =>
    items.map( item => {
      const existing = currentSlots.find( slot => strokePlanKey( slot ) === strokePlanKey( item ) )

      return {
        id: existing?.id ?? makeId(),
        lengthIndex: item.lengthIndex,
        fromM: item.fromM,
        toM: item.toM,
        label: item.label.replace( /^Count /, "Breaths " ),
        count: existing?.count ?? null,
      }
    } )

  const makeTurnDraftRows = ( items: TurnPlanItem[], currentRows: VideoTimerDraft["turns"] ): VideoTimerTurnAnalysisRecord[] =>
    items.map( item => {
      const existing = currentRows.find( row => row.turnIndex === item.turnIndex )

      return {
        turnIndex: item.turnIndex,
        breakoutM: existing?.breakoutM ?? null,
      }
    } )

  const getCurrentPlanShape = () => ( {
    surfaceKeys: props.draft.surfaceSlots.map( slot => markerPlanKey( slot ) ),
    splitKeys: props.draft.splitSlots.map( slot => markerPlanKey( slot ) ),
    strokeCountKeys: props.draft.strokeCountSlots.map( slot => strokePlanKey( slot ) ),
    breathCountKeys: props.draft.breathCountSlots.map( slot => strokePlanKey( slot ) ),
    turnKeys: props.draft.turns.map( row => row.turnIndex ),
  } )

  const getExpectedPlanShape = () => {
    const surface = buildSurfacePlan()
    const split = buildSplitPlan()
    const strokeCounts = buildStrokeCountPlan()
    const turns = buildTurnsPlan()

    return {
      surface,
      split,
      strokeCounts,
      turns,
      surfaceKeys: surface.map( item => markerPlanKey( item ) ),
      splitKeys: split.map( item => markerPlanKey( item ) ),
      strokeCountKeys: strokeCounts.map( item => strokePlanKey( item ) ),
      breathCountKeys: strokeCounts.map( item => strokePlanKey( item ) ),
      turnKeys: turns.map( item => item.turnIndex ),
    }
  }

  const sameStringArray = ( a: string[], b: string[] ) =>
    a.length === b.length && a.every( ( value, index ) => value === b[index] )

  const sameNumberArray = ( a: number[], b: number[] ) =>
    a.length === b.length && a.every( ( value, index ) => value === b[index] )

  const syncDraftPlan = () => {
    const current = getCurrentPlanShape()
    const expected = getExpectedPlanShape()

    const samePlan =
      sameStringArray( current.surfaceKeys, expected.surfaceKeys ) &&
      sameStringArray( current.splitKeys, expected.splitKeys ) &&
      sameStringArray( current.strokeCountKeys, expected.strokeCountKeys ) &&
      sameStringArray( current.breathCountKeys, expected.breathCountKeys ) &&
      sameNumberArray( current.turnKeys, expected.turnKeys )

    const savedMarkerKeys = new Set( props.draft.markers.map( marker => markerRecordKey( marker ) ) )

    const hasUnhydratedSavedMarkers =
      props.mode === "edit" &&
      props.draft.markers.length > 0 &&
      [ ...props.draft.surfaceSlots, ...props.draft.splitSlots ].some(
        slot => savedMarkerKeys.has( markerPlanKey( slot ) ) && slot.videoMs === null
      )

    const hasMissingFinishState =
      props.mode === "edit" &&
      props.draft.finishVideoMs === null &&
      getSavedFinishVideoMs() !== null

    if ( samePlan && !hasUnhydratedSavedMarkers && !hasMissingFinishState ) {
      if ( !allowsBreathMarkersForStroke( props.selections.stroke ) && props.draft.breathMarkers.length ) {
        updateDraft( next => {
          next.breathMarkers = []
        } )
        return
      }

      if ( !props.draft.selectedSlotId ) {
        const firstId =
          [ ...props.draft.surfaceSlots, ...props.draft.splitSlots ].find( slot => slot.videoMs === null )?.id ??
          [ ...props.draft.surfaceSlots, ...props.draft.splitSlots ][0]?.id ??
          null

        if ( firstId ) {
          updateDraft( next => {
            next.selectedSlotId = firstId
          } )
        }
      }
      return
    }

    const nextSurfaceSlots = makeMarkerSlotsFromPlan( expected.surface, props.draft.surfaceSlots, props.draft.markers )
    const nextSplitSlots = makeMarkerSlotsFromPlan( expected.split, props.draft.splitSlots, props.draft.markers )
    const nextStrokeCountSlots = makeStrokeCountDraftSlots( expected.strokeCounts, props.draft.strokeCountSlots )
    const nextBreathCountSlots = makeBreathCountDraftSlots( expected.strokeCounts, props.draft.breathCountSlots )
    const nextTurns = makeTurnDraftRows( expected.turns, props.draft.turns )

    const allNextSlots = [ ...nextSurfaceSlots, ...nextSplitSlots ]

    const nextSelectedSlotId =
      props.draft.selectedSlotId && allNextSlots.some( slot => slot.id === props.draft.selectedSlotId )
        ? props.draft.selectedSlotId
        : allNextSlots.find( slot => slot.videoMs === null )?.id ??
          allNextSlots[0]?.id ??
          null

    if ( props.mode === "edit" ) {
      updateDraft( next => {
        next.finishVideoMs = getSavedFinishVideoMs()
        next.startOffsetMs = props.draft.startOffsetMs
        next.surfaceSlots = nextSurfaceSlots
        next.splitSlots = nextSplitSlots
        next.strokeCountSlots = nextStrokeCountSlots
        next.breathCountSlots = nextBreathCountSlots
        next.turns = nextTurns
        next.selectedSlotId = nextSelectedSlotId
        next.markers = props.draft.markers.map( marker => ( {
          id: marker.id,
          seq: marker.seq,
          type: marker.type,
          code: marker.code,
          label: marker.label,
          lengthIndex: marker.lengthIndex,
          turnIndex: marker.turnIndex,
          tMs: marker.tMs,
        } ) )
        next.breathMarkers = allowsBreathMarkersForStroke( props.selections.stroke )
          ? props.draft.breathMarkers.map( marker => ( {
            id: marker.id,
            tMs: marker.tMs,
          } ) )
          : []
        next.strokeMarkers = ( props.draft.strokeMarkers ?? [] ).map( marker => ( {
          id: marker.id,
          tMs: marker.tMs,
        } ) )
        next.breakoutStartM = props.draft.breakoutStartM ?? 10
      } )
      return
    }

    const firstId = [ ...nextSurfaceSlots, ...nextSplitSlots ][0]?.id ?? null

    updateDraft( next => {
      next.finishVideoMs = null
      next.startOffsetMs = null
      next.surfaceSlots = nextSurfaceSlots.map( slot => ( { ...slot, videoMs: null, missed: false } ) )
      next.splitSlots = nextSplitSlots.map( slot => ( { ...slot, videoMs: null, missed: false } ) )
      next.strokeCountSlots = nextStrokeCountSlots
      next.breathCountSlots = nextBreathCountSlots
      next.turns = nextTurns
      next.selectedSlotId = firstId
      next.markers = []
      next.strokeMarkers = []
      next.breathMarkers = []
      next.breakoutStartM = 10
    } )
  }

  watch(
    () => [ props.selections.course, props.selections.stroke, props.selections.distance ],
    () => {
      syncDraftPlan()
    },
    { immediate: true }
  )

  const allMarkerSlots = computed( () =>
    [ ...props.draft.surfaceSlots, ...props.draft.splitSlots ]
      .slice()
      .sort( ( a, b ) => a.seq - b.seq )
  )

  const findSlotById = ( id: string | null ) => {
    if ( !id ) return null
    return allMarkerSlots.value.find( s => s.id === id ) ?? null
  }

  const nextSurfaceSlot = computed( () => props.draft.surfaceSlots.find( s => !s.missed && s.videoMs === null ) ?? null )
  const nextSplitSlot = computed( () => props.draft.splitSlots.find( s => s.code !== "finish_time" && !s.missed && s.videoMs === null ) ?? null )

  const parseOfficialTimeMs = ( raw: string ): number | null => {
    const s = String( raw || "" ).trim().replace( ",", "." )
    if ( !s ) return null
    const parts = s.split( ":" ).map( p => p.trim() ).filter( Boolean )
    if ( !parts.length ) return null

    const last = parts[parts.length - 1]!
    const sec = Number( last )
    if ( !Number.isFinite( sec ) ) return null

    let mins = 0
    let hrs = 0

    if ( parts.length === 2 ) {
      mins = Number( parts[0] )
      if ( !Number.isFinite( mins ) ) return null
    } else if ( parts.length === 3 ) {
      hrs = Number( parts[0] )
      mins = Number( parts[1] )
      if ( !Number.isFinite( hrs ) || !Number.isFinite( mins ) ) return null
    } else if ( parts.length > 3 ) {
      return null
    }

    const totalSeconds = ( hrs * 3600 ) + ( mins * 60 ) + sec
    if ( !( totalSeconds > 0 ) ) return null
    return Math.round( totalSeconds * 1000 )
  }

  const videoEl = ref<HTMLVideoElement | null>( null )
  const timelineEl = ref<HTMLDivElement | null>( null )

  const timelineWidthPx = ref( 0 )
  let timelineResizeObserver: ResizeObserver | null = null

  const syncTimelineWidth = () => {
    timelineWidthPx.value = Math.round( timelineEl.value?.clientWidth ?? 0 )
  }

  const isReady = ref( false )
  const isPortrait = ref( false )
  const isVideoPlaying = ref( false )

  const durationMs = ref<number>( props.video.durationMs ?? 0 )
  const currentVideoMs = ref( 0 )

  const ZOOM_LEVELS = [ 1, 2, 4, 6, 8, 10, 12, 16, 20 ] as const
  const timelineZoom = ref<number>( 1 )
  const zoomIndex = computed( () => {
    const idx = ZOOM_LEVELS.findIndex( z => z === timelineZoom.value )
    return idx >= 0 ? idx : 0
  } )
  const canZoomOut = computed( () => zoomIndex.value > 0 )
  const canZoomIn = computed( () => zoomIndex.value < ZOOM_LEVELS.length - 1 )

  const zoomOut = () => {
    if ( !canZoomOut.value ) return
    timelineZoom.value = ZOOM_LEVELS[zoomIndex.value - 1]!
  }

  const zoomIn = () => {
    if ( !canZoomIn.value ) return
    timelineZoom.value = ZOOM_LEVELS[zoomIndex.value + 1]!
  }

  const timelineCenterMs = ref( 0 )
  const officialFinishText = ref( props.initialOfficialFinishTime || "" )
  const officialFinishMs = computed( () => parseOfficialTimeMs( officialFinishText.value ) )
  const officialFinishTimeLocked = computed( () => !!(
    props.resultLink.resultSwimmer &&
    props.resultLink.resultCourse &&
    props.resultLink.resultStroke &&
    props.resultLink.resultDistance &&
    props.resultLink.resultSeq
  ) )
  const linkedResultTimeTitle = "This time comes from the selected result. Clear the result to enter a different time."
  const showFinishEditor = ref( false )
  const finishSetupError = ref( "" )

  const dragging = ref<{ kind: "start" | "finish" | "marker"; id?: string } | null>( null )

  const finishVideoMs = computed( () => props.draft.finishVideoMs )
  const startOffsetMs = computed( () => props.draft.startOffsetMs )
  const missingRaceStartMs = computed( () =>
    startOffsetMs.value !== null && startOffsetMs.value < 0
      ? Math.abs( startOffsetMs.value )
      : null
  )

  const hasFinishMarked = computed( () =>
    finishVideoMs.value !== null &&
    startOffsetMs.value !== null
  )

  watch( officialFinishText, () => {
    finishSetupError.value = ""
  } )

  const setCurrentFromVideo = () => {
    const v = videoEl.value
    if ( !v ) return
    const t = Number.isFinite( v.currentTime ) ? v.currentTime : 0
    currentVideoMs.value = Math.max( 0, Math.round( t * 1000 ) )
    if ( !dragging.value ) timelineCenterMs.value = currentVideoMs.value
  }

  const syncPlaybackState = () => {
    const v = videoEl.value
    isVideoPlaying.value = !!v && !v.paused && !v.ended
  }

  const onLoadedMetadata = () => {
    const v = videoEl.value
    if ( !v ) return
    isPortrait.value = v.videoHeight > v.videoWidth
    const d = Number.isFinite( v.duration ) ? Math.round( v.duration * 1000 ) : 0
    durationMs.value = d || props.video.durationMs || 0
    isReady.value = true
    setCurrentFromVideo()
  }

  const seekToMs = ( ms: number ) => {
    const v = videoEl.value
    if ( !v ) return
    const d = durationMs.value || 0
    const clamped = d > 0 ? Math.max( 0, Math.min( d, ms ) ) : Math.max( 0, ms )
    v.currentTime = clamped / 1000
    currentVideoMs.value = clamped
    if ( !dragging.value ) timelineCenterMs.value = clamped
  }

  const onVideoProgressInput = ( event: Event ) => {
    const input = event.target as HTMLInputElement
    seekToMs( Number( input.value ) )
  }

  const videoProgressPercent = computed( () => {
    if ( durationMs.value <= 0 ) return 0
    return Math.min( 100, Math.max( 0, ( currentVideoMs.value / durationMs.value ) * 100 ) )
  } )

  const toggleVideoPlayback = async () => {
    const v = videoEl.value
    if ( !v ) return

    if ( v.paused || v.ended ) {
      try {
        await v.play()
      } catch ( error ) {
        void error
      }
    } else {
      v.pause()
    }

    syncPlaybackState()
  }

  const toRaceMs = ( videoMs: number ) => {
    if ( props.draft.startOffsetMs === null ) return 0
    return videoMs - props.draft.startOffsetMs
  }

  const formatRaceMs = ( ms: number ) => {
    const totalMs = Math.max( 0, Math.floor( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const m = Math.floor( totalSeconds / 60 )
    const ss = String( totalSeconds % 60 ).padStart( 2, "0" )
    const cs = String( Math.floor( ( totalMs % 1000 ) / 10 ) ).padStart( 2, "0" )
    return `${m}:${ss}.${cs}`
  }

  const formatVideoMsPrecise = ( ms: number ) => {
    const totalMs = Math.max( 0, Math.floor( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const m = Math.floor( totalSeconds / 60 )
    const ss = String( totalSeconds % 60 ).padStart( 2, "0" )
    const mmm = String( totalMs % 1000 ).padStart( 3, "0" )
    return `${m}:${ss}.${mmm}`
  }

  const markerPinClass = ( s: MarkerSlot ) => [
    s.type === "surfacing" ? "bg-cyan-500" : "bg-blue-500",
    s.id === props.draft.selectedSlotId ? "z-10 ring-2 ring-white ring-offset-1 ring-offset-gray-200" : "",
  ]

  const startPinMs = computed( () => props.draft.startOffsetMs )
  const finishPinMs = computed( () => props.draft.finishVideoMs )

  const visibleRangeMs = computed( () => {
    const d = durationMs.value || 0
    if ( !d ) return 0
    const base = Math.round( d / Math.max( 1, timelineZoom.value ) )
    return Math.max( 1, Math.min( d, Math.max( 500, base ) ) )
  } )

  const visibleStartMs = computed( () => {
    const d = durationMs.value || 0
    const range = visibleRangeMs.value || 0
    if ( !d || !range ) return 0
    if ( range >= d ) return 0
    const raw = timelineCenterMs.value - Math.round( range / 2 )
    return Math.max( 0, Math.min( d - range, raw ) )
  } )

  const visibleEndMs = computed( () => {
    const d = durationMs.value || 0
    if ( !d ) return 0
    return Math.min( d, visibleStartMs.value + visibleRangeMs.value )
  } )

  const isMsVisibleInTimeline = ( ms: number | null ) => {
    if ( ms === null ) return false
    return ms >= visibleStartMs.value && ms <= visibleEndMs.value
  }

  const pctFromVisibleMs = ( ms: number ) => {
    const range = visibleRangeMs.value || 0
    if ( !range ) return 0
    const pct = ( ( ms - visibleStartMs.value ) / range ) * 100
    return Math.max( 0, Math.min( 100, pct ) )
  }

  const msFromClientXVisible = ( clientX: number ) => {
    const el = timelineEl.value
    const range = visibleRangeMs.value || 0
    if ( !el || !range ) return 0

    const r = el.getBoundingClientRect()
    const x = Math.max( 0, Math.min( r.width, clientX - r.left ) )
    const pct = r.width > 0 ? ( x / r.width ) : 0
    return Math.round( visibleStartMs.value + ( pct * range ) )
  }

  const getLiveVideoMs = () => {
    const v = videoEl.value
    if ( v && Number.isFinite( v.currentTime ) ) {
      return Math.max( 0, Math.round( v.currentTime * 1000 ) )
    }
    return Math.max( 0, currentVideoMs.value )
  }

  const validateFinishSetup = ( finishMs: number ) => {
    if ( officialFinishMs.value === null ) {
      return {
        ok: false as const,
        message: "Official finish time is required.",
        startOffset: null,
      }
    }

    if ( finishMs < 0 || ( durationMs.value > 0 && finishMs > durationMs.value ) ) {
      return {
        ok: false as const,
        message: "The finish marker must be inside the video.",
        startOffset: null,
      }
    }

    const startOffset = finishMs - officialFinishMs.value

    return {
      ok: true as const,
      message: "",
      startOffset,
    }
  }

  const setFinishHere = () => {
    if ( !isReady.value ) return false

    const finishMs = getLiveVideoMs()
    const validation = validateFinishSetup( finishMs )

    if ( !validation.ok || validation.startOffset === null ) {
      finishSetupError.value = validation.message
      return false
    }

    finishSetupError.value = ""

    updateDraft( next => {
      next.finishVideoMs = finishMs
      next.startOffsetMs = validation.startOffset
      const finishTimeSlot = next.splitSlots.find( s => s.code === "finish_time" ) ?? null
      if ( finishTimeSlot ) {
        finishTimeSlot.videoMs = finishMs
        finishTimeSlot.missed = false
      }
    } )

    currentVideoMs.value = finishMs
    timelineCenterMs.value = finishMs

    return true
  }

  const recalculateStartFromCurrentFinish = () => {
    if ( props.draft.finishVideoMs === null ) return

    const validation = validateFinishSetup( props.draft.finishVideoMs )

    if ( !validation.ok || validation.startOffset === null ) {
      finishSetupError.value = validation.message
      return
    }

    finishSetupError.value = ""

    updateDraft( next => {
      next.startOffsetMs = validation.startOffset
    } )
  }

  const setFinishHereAndCloseEditor = () => {
    if ( setFinishHere() ) {
      showFinishEditor.value = false
    }
  }

  const clearMarker = ( id: string ) => {
    updateDraft( next => {
      const slot = [ ...next.surfaceSlots, ...next.splitSlots ].find( x => x.id === id ) ?? null
      if ( !slot ) return
      if ( slot.code === "finish_time" ) return
      slot.videoMs = null
      slot.missed = false
    } )
  }

  const selectMarker = ( id: string ) => {
    const selected = findSlotById( id )
    if ( selected ) activeMarkerTab.value = selected.type
    updateDraft( next => {
      next.selectedSlotId = id
    } )
    if ( selected?.videoMs !== null ) {
      seekToMs( selected.videoMs )
    }
  }

  const placeMarkerAtCursor = ( type: MarkerType ) => {
    if ( !isReady.value ) return
    activeMarkerTab.value = type

    const nowMs = getLiveVideoMs()

    if ( type === "surfacing" ) {
      const nextSlot = nextSurfaceSlot.value
      if ( !nextSlot ) return
      updateDraft( draft => {
        const slot = draft.surfaceSlots.find( x => x.id === nextSlot.id )
        if ( !slot ) return
        slot.videoMs = nowMs
        slot.missed = false
        draft.selectedSlotId = slot.id
      } )
      return
    }

    const nextSlot = nextSplitSlot.value
    if ( !nextSlot ) return
    updateDraft( draft => {
      const slot = draft.splitSlots.find( x => x.id === nextSlot.id )
      if ( !slot ) return
      slot.videoMs = nowMs
      slot.missed = false
      draft.selectedSlotId = slot.id
    } )
  }

  const placeBreathMarkerAtCursor = () => {
    if ( !isReady.value || !supportsBreathMarkers.value || !breathMarkersEnabled.value ) return

    const nowMs = getLiveVideoMs()

    updateDraft( draft => {
      draft.breathMarkers.push( {
        id: makeId(),
        tMs: nowMs,
      } )
      draft.breathMarkers.sort( ( a, b ) => a.tMs - b.tMs )
    } )
  }

  const placeStrokeMarkerAtCursor = () => {
    if ( !isReady.value || !strokeMarkersEnabled.value ) return

    const nowMs = getLiveVideoMs()

    updateDraft( draft => {
      draft.strokeMarkers ??= []
      draft.strokeMarkers.push( {
        id: makeId(),
        tMs: nowMs,
      } )
      draft.strokeMarkers.sort( ( a, b ) => a.tMs - b.tMs )
    } )
  }

  const placeActiveMarkerAtCursor = () => {
    const tab = activeMarkerTab.value

    if ( tab === "breath" ) {
      placeBreathMarkerAtCursor()
      return
    }

    if ( tab === "stroke" ) {
      placeStrokeMarkerAtCursor()
      return
    }

    placeMarkerAtCursor( tab )
  }

  const clearStrokeMarker = ( id: string ) => {
    updateDraft( draft => {
      draft.strokeMarkers = ( draft.strokeMarkers ?? [] ).filter( marker => marker.id !== id )
    } )
  }

  const clearBreathMarker = ( id: string ) => {
    updateDraft( draft => {
      draft.breathMarkers = draft.breathMarkers.filter( marker => marker.id !== id )
    } )
  }

  const onTimelinePointerDown = ( e: PointerEvent ) => {
    if ( !isReady.value ) return
    seekToMs( msFromClientXVisible( e.clientX ) )
  }

  const onPinPointerDown = ( kind: "start" | "finish" | "marker", id: string | undefined, e: PointerEvent ) => {
    e.stopPropagation()
    if ( !isReady.value ) return
    dragging.value = { kind, id }
    ;( e.currentTarget as HTMLElement ).setPointerCapture( e.pointerId )
    const ms = msFromClientXVisible( e.clientX )

    updateDraft( next => {
      if ( kind === "start" ) {
        next.startOffsetMs = ms
      }

      if ( kind === "finish" ) {
        next.finishVideoMs = ms
        const finishTimeSlot = next.splitSlots.find( s => s.code === "finish_time" ) ?? null
        if ( finishTimeSlot ) {
          finishTimeSlot.videoMs = ms
          finishTimeSlot.missed = false
        }
      }

      if ( kind === "marker" && id ) {
        const slot = [ ...next.surfaceSlots, ...next.splitSlots ].find( x => x.id === id ) ?? null
        if ( slot ) {
          slot.videoMs = ms
          slot.missed = false
          next.selectedSlotId = id
        }
      }
    } )

    seekToMs( ms )
  }

  const onPinPointerMove = ( e: PointerEvent ) => {
    if ( !dragging.value ) return
    const ms = msFromClientXVisible( e.clientX )
    const { kind, id } = dragging.value

    updateDraft( next => {
      if ( kind === "start" ) {
        next.startOffsetMs = ms
      }

      if ( kind === "finish" ) {
        next.finishVideoMs = ms
        const finishTimeSlot = next.splitSlots.find( s => s.code === "finish_time" ) ?? null
        if ( finishTimeSlot ) {
          finishTimeSlot.videoMs = ms
          finishTimeSlot.missed = false
        }
      }

      if ( kind === "marker" && id ) {
        const slot = [ ...next.surfaceSlots, ...next.splitSlots ].find( x => x.id === id ) ?? null
        if ( slot ) {
          slot.videoMs = ms
          slot.missed = false
        }
      }
    } )

    seekToMs( ms )
  }

  const onPinPointerUp = ( e: PointerEvent ) => {
    if ( !dragging.value ) return
    dragging.value = null
    timelineCenterMs.value = currentVideoMs.value

    const el = e.currentTarget as HTMLElement | null
    if ( el && el.hasPointerCapture( e.pointerId ) ) {
      el.releasePointerCapture( e.pointerId )
    }
  }

  const allMarkersPlaced = computed( () =>
    allMarkerSlots.value
      .filter( s => s.code !== "finish_time" )
      .every( s => s.videoMs !== null )
  )

  const requiredSplitMarkersPlaced = computed( () =>
    props.draft.splitSlots
      .filter( slot => slot.code !== "finish_time" )
      .every( slot => slot.videoMs !== null )
  )

  const activePanelTab = ref<TimingPanelTab>( "markers" )
  const activeMarkerTab = ref<MarkerPanelTab>( "surfacing" )
  const supportsBreathMarkers = computed( () => allowsBreathMarkersForStroke( props.selections.stroke ) )

  const activeNextMarker = computed( () =>
    activeMarkerTab.value === "surfacing"
      ? nextSurfaceSlot.value
      : activeMarkerTab.value === "split"
        ? nextSplitSlot.value
        : null
  )

  const lengthSegments = computed( () =>
    props.draft.strokeCountSlots.map( slot => {
      const startMs =
        slot.lengthIndex === 1
          ? props.draft.startOffsetMs
          : props.draft.splitSlots.find( marker => marker.code === "hit_pad" && marker.turnIndex === slot.lengthIndex - 1 )?.videoMs ?? null

      const endMs =
        slot.lengthIndex < props.draft.strokeCountSlots.length
          ? props.draft.splitSlots.find( marker => marker.code === "hit_pad" && marker.turnIndex === slot.lengthIndex )?.videoMs ?? null
          : props.draft.finishVideoMs

      return {
        lengthIndex: slot.lengthIndex,
        fromM: slot.fromM,
        toM: slot.toM,
        label: `${slot.fromM} - ${slot.toM}m`,
        startMs,
        endMs,
      }
    } )
  )

  const breathMarkersEnabled = computed( () =>
    supportsBreathMarkers.value &&
    props.draft.startOffsetMs !== null &&
    props.draft.finishVideoMs !== null &&
    requiredSplitMarkersPlaced.value &&
    lengthSegments.value.length > 0 &&
    lengthSegments.value.every( segment => segment.startMs !== null && segment.endMs !== null )
  )

  const strokeMarkersEnabled = computed( () =>
    props.draft.startOffsetMs !== null &&
    props.draft.finishVideoMs !== null &&
    requiredSplitMarkersPlaced.value &&
    lengthSegments.value.length > 0 &&
    lengthSegments.value.every( segment => segment.startMs !== null && segment.endMs !== null )
  )

  const findLengthSegment = ( tMs: number ) =>
    lengthSegments.value.find( ( segment, index ) => {
      if ( segment.startMs === null || segment.endMs === null ) return false
      const isLast = index === lengthSegments.value.length - 1
      return tMs >= segment.startMs && ( isLast ? tMs <= segment.endMs : tMs < segment.endMs )
    } ) ?? null

  const strokeMarkerRows = computed( () =>
    [ ...( props.draft.strokeMarkers ?? [] ) ]
      .sort( ( a, b ) => a.tMs - b.tMs )
      .map( marker => ( {
        ...marker,
        segment: findLengthSegment( marker.tMs ),
      } ) )
  )

  const strokeCountsByLength = computed( () => {
    const counts = new Map<number, number>()

    for ( const marker of strokeMarkerRows.value ) {
      if ( !marker.segment ) continue
      counts.set( marker.segment.lengthIndex, ( counts.get( marker.segment.lengthIndex ) ?? 0 ) + 1 )
    }

    return counts
  } )

  const usesStrokeMarkers = computed( () => strokeMarkerRows.value.length > 0 )

  const strokeCountsComplete = computed( () =>
    props.draft.strokeCountSlots.length > 0 &&
    props.draft.strokeCountSlots.every( slot =>
      usesStrokeMarkers.value
        ? ( strokeCountsByLength.value.get( slot.lengthIndex ) ?? 0 ) > 0
        : slot.count !== null && slot.count > 0
    )
  )

  const countRows = computed( () =>
    props.draft.strokeCountSlots.map( stroke => ( {
      id: stroke.id,
      label: stroke.label,
      stroke,
      count: usesStrokeMarkers.value
        ? strokeCountsByLength.value.get( stroke.lengthIndex ) ?? 0
        : stroke.count ?? 0,
    } ) )
  )

  const breathMarkerRows = computed( () =>
    ( supportsBreathMarkers.value ? [ ...props.draft.breathMarkers ] : [] )
      .sort( ( a, b ) => a.tMs - b.tMs )
      .map( marker => ( {
        ...marker,
        segment: findLengthSegment( marker.tMs ),
      } ) )
  )

  const markerProgress = computed( () => {
    const slots = allMarkerSlots.value.filter( slot => slot.code !== "finish_time" )
    return {
      complete: slots.filter( slot => slot.videoMs !== null ).length,
      total: slots.length,
    }
  } )

  const surfacingProgress = computed( () => ( {
    complete: props.draft.surfaceSlots.filter( slot => slot.videoMs !== null ).length,
    total: props.draft.surfaceSlots.length,
  } ) )

  const splitProgress = computed( () => {
    const slots = props.draft.splitSlots.filter( slot => slot.code !== "finish_time" )
    return {
      complete: slots.filter( slot => slot.videoMs !== null ).length,
      total: slots.length,
    }
  } )

  const breathMarkerProgress = computed( () => ( {
    complete: breathMarkerRows.value.length,
    total: breathMarkerRows.value.length,
  } ) )

  const strokeMarkerProgress = computed( () => ( {
    complete: strokeMarkerRows.value.length,
    total: strokeMarkerRows.value.length,
  } ) )

  watch(
    supportsBreathMarkers,
    ( supported ) => {
      if ( supported ) return
      if ( activeMarkerTab.value === "breath" ) activeMarkerTab.value = "surfacing"
      if ( props.draft.breathMarkers.length ) {
        updateDraft( next => {
          next.breathMarkers = []
        } )
      }
    },
    { immediate: true }
  )

  const countProgress = computed( () => {
    const slots = props.draft.strokeCountSlots
    return {
      complete: slots.filter( slot =>
        usesStrokeMarkers.value
          ? ( strokeCountsByLength.value.get( slot.lengthIndex ) ?? 0 ) > 0
          : slot.count !== null && slot.count > 0
      ).length,
      total: slots.length,
    }
  } )

  const canStop = computed( () =>
    ( props.mode === "edit" || isReady.value ) &&
    props.draft.startOffsetMs !== null &&
    props.draft.finishVideoMs !== null &&
    allMarkersPlaced.value &&
    strokeCountsComplete.value
  )

  const emitStop = () => {
    const markers: VideoTimerMarkerRecord[] = allMarkerSlots.value
      .filter( slot => slot.videoMs !== null )
      .map( slot => ( {
        id: slot.id,
        type: slot.type,
        code: slot.code,
        label: slot.label,
        lengthIndex: slot.lengthIndex,
        turnIndex: slot.turnIndex,
        tMs: slot.videoMs as number,
      } ) )

    const v = videoEl.value
    if ( v ) v.pause()
    emit( "stop", { markers } )
  }

  const onBack = () => {
    const v = videoEl.value
    if ( v ) v.pause()
    emit( "back" )
  }

  onMounted( () => {
    syncTimelineWidth()

    if ( typeof window !== "undefined" ) {
      window.addEventListener( "resize", syncTimelineWidth )
    }

    if ( typeof ResizeObserver !== "undefined" && timelineEl.value ) {
      timelineResizeObserver = new ResizeObserver( () => syncTimelineWidth() )
      timelineResizeObserver.observe( timelineEl.value )
    }
  } )

  onBeforeUnmount( () => {
    if ( typeof window !== "undefined" ) {
      window.removeEventListener( "resize", syncTimelineWidth )
    }
    timelineResizeObserver?.disconnect()
  } )

  const formatTickLabel = ( ms: number ) => {
    if ( timelineZoom.value >= 8 ) return formatVideoMsPrecise( ms )
    const totalMs = Math.max( 0, Math.floor( ms ) )
    const totalSeconds = Math.floor( totalMs / 1000 )
    const m = Math.floor( totalSeconds / 60 )
    const ss = String( totalSeconds % 60 ).padStart( 2, "0" )
    return `${m}:${ss}`
  }

  const tickConfig = computed( () => {
    const r = visibleRangeMs.value || 0
    if ( r <= 1500 ) return { step: 100, labelEvery: 5 }
    if ( r <= 4000 ) return { step: 200, labelEvery: 5 }
    if ( r <= 10000 ) return { step: 500, labelEvery: 2 }
    if ( r <= 20000 ) return { step: 1000, labelEvery: 2 }
    if ( r <= 40000 ) return { step: 2000, labelEvery: 2 }
    return { step: 5000, labelEvery: 1 }
  } )

  const tickLabelMinGapPx = computed( () => timelineZoom.value >= 8 ? 84 : 56 )

  const timelineTicks = computed( () => {
    const start = visibleStartMs.value
    const end = visibleEndMs.value
    const step = tickConfig.value.step

    if ( step <= 0 || end <= start ) return [] as Array<{ ms: number; showLabel: boolean }>

    const width = Math.max( 1, timelineWidthPx.value )
    const range = Math.max( 1, end - start )
    const pxPerStep = ( width * step ) / range

    const dynamicLabelEvery = Math.max( 1, Math.ceil( tickLabelMinGapPx.value / Math.max( 1, pxPerStep ) ) )
    const labelEvery = Math.max( tickConfig.value.labelEvery, dynamicLabelEvery )

    const first = Math.ceil( start / step ) * step
    const out: Array<{ ms: number; showLabel: boolean }> = []

    let i = 0
    for ( let t = first; t <= end; t += step ) {
      out.push( { ms: t, showLabel: i % labelEvery === 0 } )
      i++
    }

    return out
  } )

</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="flex flex-col items-center px-3 py-4 sm:px-6 sm:py-6">
        <div class="w-full max-w-7xl">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold text-gray-800">Timing mode</div>
            <div class="flex items-center gap-3">
              <div
                v-if="props.saveStatus"
                class="text-xs font-medium"
                :class="props.saveStatus === 'error' ? 'text-red-600' : props.saveStatus === 'saved' ? 'text-green-700' : 'text-gray-500'"
              >
                {{ props.saveStatus === "saving" ? "Saving…" : props.saveStatus === "saved" ? "Saved" : props.saveStatus === "error" ? "Could not save" : "" }}
              </div>

              <button class="h-10 px-4 rounded-md bg-gray-200 text-gray-900" type="button" @click="onBack">
                Back
              </button>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(440px,0.85fr)] gap-4 items-start">
            <div class="w-full xl:sticky xl:top-4">
              <div class="text-sm font-semibold text-gray-800 mb-2">Video</div>

              <div class="w-full rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
                <div class="p-3 text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                  <div><span class="font-semibold">Course:</span> {{ props.selections.course }}</div>
                  <div><span class="font-semibold">Stroke:</span> {{ props.selections.stroke }}</div>
                  <div><span class="font-semibold">Distance:</span> {{ props.selections.distance }}</div>
                </div>

                <div
                  class="relative bg-black flex items-center justify-center overflow-hidden"
                  :class="isPortrait ? 'h-[42vh] min-h-[220px] max-h-[380px] sm:h-[52vh] sm:min-h-[320px] sm:max-h-[520px] xl:h-[62vh] xl:min-h-[360px] xl:max-h-[640px]' : 'aspect-video max-h-[520px]'"
                >
                  <video
                    ref="videoEl"
                    preload="auto"
                    :src="props.video.playbackUrl"
                    playsinline
                    class="object-contain max-w-full max-h-full"
                    :class="isPortrait ? 'h-full w-auto' : 'w-full h-full'"
                    @loadedmetadata="onLoadedMetadata"
                    @timeupdate="setCurrentFromVideo"
                    @seeked="setCurrentFromVideo"
                    @play="syncPlaybackState"
                    @pause="syncPlaybackState"
                    @ended="syncPlaybackState"
                    @click="toggleVideoPlayback"
                  />

                  <button
                    class="absolute bottom-5 left-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/40 backdrop-blur-sm hover:bg-black/80"
                    type="button"
                    :aria-label="isVideoPlaying ? 'Pause video' : 'Play video'"
                    :title="isVideoPlaying ? 'Pause' : 'Play'"
                    @click.stop="toggleVideoPlayback"
                  >
                    <span v-if="isVideoPlaying" class="flex h-4 w-4 items-center justify-center gap-1">
                      <span class="h-4 w-1.5 rounded-sm bg-white" />
                      <span class="h-4 w-1.5 rounded-sm bg-white" />
                    </span>
                    <span v-else class="ml-0.5 h-0 w-0 border-y-[8px] border-y-transparent border-l-[12px] border-l-white" />
                  </button>

                  <input
                    class="video-progress absolute bottom-2 left-3 right-3 w-auto cursor-pointer disabled:cursor-default"
                    type="range"
                    min="0"
                    :max="Math.max(durationMs, 1)"
                    step="10"
                    :value="currentVideoMs"
                    :disabled="!isReady || durationMs <= 0"
                    :style="{ '--video-progress': `${videoProgressPercent}%` }"
                    aria-label="Video progress"
                    @input="onVideoProgressInput"
                  >
                </div>

                <div v-if="false" class="px-3 pb-3">
                  <div class="mt-4 flex items-center justify-between gap-4">
                    <div class="min-w-0 text-xs tabular-nums text-gray-500 truncate">
                      View: {{ formatVideoMsPrecise(visibleStartMs) }} → {{ formatVideoMsPrecise(visibleEndMs) }}
                    </div>

                    <div class="shrink-0 flex items-center gap-2">
                      <button
                        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        type="button"
                        :disabled="!canZoomOut"
                        @click="zoomOut"
                      >
                        −
                      </button>

                      <div class="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-gray-700">
                        x{{ timelineZoom }}
                      </div>

                      <button
                        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        type="button"
                        :disabled="!canZoomIn"
                        @click="zoomIn"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div class="mt-2 flex items-center justify-between gap-3 text-xs tabular-nums text-gray-500">
                    <div class="shrink-0 font-semibold text-gray-700 ml-auto">
                      Cursor: {{ formatVideoMsPrecise(currentVideoMs) }}
                    </div>
                  </div>

                  <div v-if="timelineTicks.length" class="relative mt-4 h-9 overflow-hidden rounded-md border border-gray-200 bg-white px-1">
                    <div
                      v-for="timelineTick in timelineTicks"
                      :key="`tick-${timelineTick.ms}`"
                      class="absolute top-0 bottom-0"
                      :style="{ left: `${pctFromVisibleMs(timelineTick.ms)}%` }"
                    >
                      <div class="w-px" :class="timelineTick.showLabel ? 'h-4 bg-gray-500' : 'h-2 bg-gray-300'" />
                      <div
                        v-if="timelineTick.showLabel"
                        class="mt-0.5 -translate-x-1/2 text-xs font-medium tabular-nums text-gray-700 whitespace-nowrap bg-white/90 px-1 rounded"
                      >
                        {{ formatTickLabel(timelineTick.ms) }}
                      </div>
                    </div>
                  </div>

                  <div
                    ref="timelineEl"
                    :class="[
                      'relative mt-4 h-10 rounded-md overflow-hidden cursor-pointer select-none',
                      !hasFinishMarked ? 'bg-amber-100 ring-2 ring-amber-300' : 'bg-gray-200'
                    ]"
                    @pointerdown="onTimelinePointerDown"
                  >
                    <div class="absolute inset-y-0 w-0.5 bg-gray-700" :style="{ left: `${pctFromVisibleMs(currentVideoMs)}%` }" />

                    <div
                      v-if="startPinMs !== null && durationMs && isMsVisibleInTimeline(startPinMs)"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-3 rounded bg-green-700"
                      :style="{ left: `${pctFromVisibleMs(startPinMs)}%` }"
                      @pointerdown="(e) => onPinPointerDown('start', undefined, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />

                    <div
                      v-if="finishPinMs !== null && durationMs && isMsVisibleInTimeline(finishPinMs)"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-3 rounded bg-red-700"
                      :style="{ left: `${pctFromVisibleMs(finishPinMs)}%` }"
                      @pointerdown="(e) => onPinPointerDown('finish', undefined, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />

                    <div
                      v-for="s in allMarkerSlots"
                      v-show="s.videoMs !== null && isMsVisibleInTimeline(s.videoMs)"
                      :key="s.id"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-2 rounded transition-shadow"
                      :class="markerPinClass(s)"
                      :style="{ left: `${pctFromVisibleMs(s.videoMs!)}%` }"
                      @pointerdown="(e) => onPinPointerDown('marker', s.id, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />

                    <div
                      v-for="marker in strokeMarkerRows"
                      v-show="isMsVisibleInTimeline(marker.tMs)"
                      :key="`stroke-${marker.id}`"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-2 rounded bg-violet-600 ring-1 ring-white"
                      :style="{ left: `${pctFromVisibleMs(marker.tMs)}%` }"
                      :title="`Stroke ${formatVideoMsPrecise(marker.tMs)}`"
                    />

                    <div
                      v-for="marker in breathMarkerRows"
                      v-show="supportsBreathMarkers && isMsVisibleInTimeline(marker.tMs)"
                      :key="`breath-${marker.id}`"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-2 rounded bg-amber-500 ring-1 ring-white"
                      :style="{ left: `${pctFromVisibleMs(marker.tMs)}%` }"
                      :title="`Breath ${formatVideoMsPrecise(marker.tMs)}`"
                    />
                  </div>

                  <div class="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-green-700" /> Start</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-red-700" /> Finish</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-cyan-600" /> Surfacing</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-blue-600" /> Split</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-violet-600" /> Stroke</div>
                    <div v-if="supportsBreathMarkers" class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-amber-500" /> Breath</div>
                  </div>

                </div>
              </div>
            </div>

            <div class="w-full">
              <div class="text-sm font-semibold text-gray-800 mb-2">Controls</div>

              <div class="space-y-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-13rem)] xl:overflow-y-auto xl:pr-1">
                <div class="w-full rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <div class="flex items-center justify-between gap-4">
                    <div class="min-w-0 text-xs tabular-nums text-gray-500 truncate">
                      View: {{ formatVideoMsPrecise(visibleStartMs) }} -> {{ formatVideoMsPrecise(visibleEndMs) }}
                    </div>

                    <div class="shrink-0 flex items-center gap-2">
                      <button
                        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        type="button"
                        :disabled="!canZoomOut"
                        @click="zoomOut"
                      >
                        -
                      </button>

                      <div class="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-gray-700">
                        x{{ timelineZoom }}
                      </div>

                      <button
                        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        type="button"
                        :disabled="!canZoomIn"
                        @click="zoomIn"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div class="mt-2 flex items-center justify-between gap-3 text-xs tabular-nums text-gray-500">
                    <div class="shrink-0 font-semibold text-gray-700 ml-auto">
                      Cursor: {{ formatVideoMsPrecise(currentVideoMs) }}
                    </div>
                  </div>

                  <div v-if="timelineTicks.length" class="relative mt-4 h-9 overflow-hidden rounded-md border border-gray-200 bg-white px-1">
                    <div
                      v-for="timelineTick in timelineTicks"
                      :key="`tick-${timelineTick.ms}`"
                      class="absolute top-0 bottom-0"
                      :style="{ left: `${pctFromVisibleMs(timelineTick.ms)}%` }"
                    >
                      <div class="w-px" :class="timelineTick.showLabel ? 'h-4 bg-gray-500' : 'h-2 bg-gray-300'" />
                      <div
                        v-if="timelineTick.showLabel"
                        class="mt-0.5 -translate-x-1/2 text-xs font-medium tabular-nums text-gray-700 whitespace-nowrap bg-white/90 px-1 rounded"
                      >
                        {{ formatTickLabel(timelineTick.ms) }}
                      </div>
                    </div>
                  </div>

                  <div
                    ref="timelineEl"
                    :class="[
                      'relative mt-4 h-10 rounded-md overflow-hidden cursor-pointer select-none',
                      !hasFinishMarked ? 'bg-amber-100 ring-2 ring-amber-300' : 'bg-gray-200'
                    ]"
                    @pointerdown="onTimelinePointerDown"
                  >
                    <div class="absolute inset-y-0 w-0.5 bg-gray-700" :style="{ left: `${pctFromVisibleMs(currentVideoMs)}%` }" />

                    <div
                      v-if="startPinMs !== null && durationMs && isMsVisibleInTimeline(startPinMs)"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-3 rounded bg-green-700"
                      :style="{ left: `${pctFromVisibleMs(startPinMs)}%` }"
                      @pointerdown="(e) => onPinPointerDown('start', undefined, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />

                    <div
                      v-if="finishPinMs !== null && durationMs && isMsVisibleInTimeline(finishPinMs)"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-3 rounded bg-red-700"
                      :style="{ left: `${pctFromVisibleMs(finishPinMs)}%` }"
                      @pointerdown="(e) => onPinPointerDown('finish', undefined, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />

                    <div
                      v-for="s in allMarkerSlots"
                      v-show="s.videoMs !== null && isMsVisibleInTimeline(s.videoMs)"
                      :key="s.id"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-2 rounded transition-shadow"
                      :class="markerPinClass(s)"
                      :style="{ left: `${pctFromVisibleMs(s.videoMs!)}%` }"
                      @pointerdown="(e) => onPinPointerDown('marker', s.id, e)"
                      @pointermove="onPinPointerMove"
                      @pointerup="onPinPointerUp"
                    />

                    <div
                      v-for="marker in strokeMarkerRows"
                      v-show="isMsVisibleInTimeline(marker.tMs)"
                      :key="`stroke-${marker.id}`"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-2 rounded bg-violet-600 ring-1 ring-white"
                      :style="{ left: `${pctFromVisibleMs(marker.tMs)}%` }"
                      :title="`Stroke ${formatVideoMsPrecise(marker.tMs)}`"
                    />

                    <div
                      v-for="marker in breathMarkerRows"
                      v-show="supportsBreathMarkers && isMsVisibleInTimeline(marker.tMs)"
                      :key="`breath-${marker.id}`"
                      class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-2 rounded bg-amber-500 ring-1 ring-white"
                      :style="{ left: `${pctFromVisibleMs(marker.tMs)}%` }"
                      :title="`Breath ${formatVideoMsPrecise(marker.tMs)}`"
                    />
                  </div>

                  <div class="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-green-700" /> Start</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-red-700" /> Finish</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-cyan-600" /> Surfacing</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-blue-600" /> Split</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-violet-600" /> Stroke</div>
                    <div v-if="supportsBreathMarkers" class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-amber-500" /> Breath</div>
                  </div>

                  <div
                    v-if="missingRaceStartMs !== null"
                    class="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                  >
                    The race started {{ formatVideoMsPrecise(missingRaceStartMs) }} before this video. Marker times include the missing beginning of the race.
                  </div>
                </div>

                <div class="w-full rounded-xl border border-gray-200 bg-white p-4">
                  <template v-if="!hasFinishMarked">
                    <div class="mt-2">
                      <div class="text-xs font-semibold text-gray-700 mb-2">
                        Step 1: Find the exact finish moment
                      </div>

                      <div class="grid grid-cols-1 gap-3">
                        <div>
                          <VideoTimerOfficialTimeInput
                            v-model="officialFinishText"
                            label="Official finish time"
                            :disabled="officialFinishTimeLocked"
                            :title="officialFinishTimeLocked ? linkedResultTimeTitle : undefined"
                          />

                          <p v-if="officialFinishTimeLocked" class="mt-1 text-[11px] text-indigo-700">
                            This time comes from the selected result and cannot be edited.
                          </p>

                          <div
                            v-if="officialFinishText.trim() && officialFinishMs === null"
                            class="mt-1 text-[11px] text-red-600"
                          >
                            Invalid time format.
                          </div>

                          <div
                            v-else-if="finishSetupError"
                            class="mt-1 text-[11px] text-red-600"
                          >
                            {{ finishSetupError }}
                          </div>
                        </div>

                        <button
                          class="h-10 px-3 rounded-md bg-red-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          type="button"
                          :disabled="!isReady || officialFinishMs === null"
                          @click="setFinishHere"
                        >
                          Set finish and calculate race start
                        </button>
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <div class="mb-3 flex items-center justify-between gap-3">
                      <div class="text-xs font-semibold text-gray-700">
                        Step 2: Place markers
                      </div>

                      <button
                        class="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        type="button"
                        @click="showFinishEditor = !showFinishEditor"
                      >
                        {{ showFinishEditor ? "Hide finish editor" : "Edit finish / start" }}
                      </button>
                    </div>

                    <div
                      v-if="showFinishEditor"
                      class="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3"
                    >
                      <div class="text-xs font-semibold text-gray-700 mb-2">
                        Edit finish / race start
                      </div>

                      <div class="grid grid-cols-1 gap-3">
                        <div>
                          <VideoTimerOfficialTimeInput
                            v-model="officialFinishText"
                            label="Official finish time"
                            :disabled="officialFinishTimeLocked"
                            :title="officialFinishTimeLocked ? linkedResultTimeTitle : undefined"
                          />

                          <p v-if="officialFinishTimeLocked" class="mt-1 text-[11px] text-indigo-700">
                            This time comes from the selected result and cannot be edited.
                          </p>

                          <div
                            v-if="officialFinishText.trim() && officialFinishMs === null"
                            class="mt-1 text-[11px] text-red-600"
                          >
                            Invalid time format.
                          </div>

                          <div
                            v-else-if="finishSetupError"
                            class="mt-1 text-[11px] text-red-600"
                          >
                            {{ finishSetupError }}
                          </div>
                        </div>

                        <div class="grid grid-cols-1 gap-2">
                          <button
                            class="min-h-[40px] px-3 py-2 rounded-md bg-gray-900 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-normal leading-5"
                            type="button"
                            :disabled="props.draft.finishVideoMs === null || officialFinishMs === null"
                            @click="recalculateStartFromCurrentFinish"
                          >
                            Recalculate start from current finish
                          </button>

                          <button
                            class="min-h-[40px] px-3 py-2 rounded-md bg-red-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-normal leading-5"
                            type="button"
                            :disabled="!isReady || officialFinishMs === null"
                            @click="setFinishHereAndCloseEditor"
                          >
                            Set finish here and recalculate
                          </button>
                        </div>

                        <div class="text-[11px] text-gray-600">
                          Use the first button if only the official time changed. Use the second if you also want to move the finish marker to the current cursor position.
                        </div>
                      </div>
                    </div>

                    <div class="flex border-b border-gray-200" role="tablist" aria-label="Timing data">
                      <button
                        class="flex-1 border-b-2 px-3 py-2 text-xs font-semibold transition-colors"
                        :class="activePanelTab === 'markers' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
                        type="button"
                        role="tab"
                        :aria-selected="activePanelTab === 'markers'"
                        @click="activePanelTab = 'markers'"
                      >
                        Markers {{ markerProgress.complete }}/{{ markerProgress.total }}
                      </button>

                      <button
                        class="flex-1 border-b-2 px-3 py-2 text-xs font-semibold transition-colors"
                        :class="activePanelTab === 'counts' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
                        type="button"
                        role="tab"
                        :aria-selected="activePanelTab === 'counts'"
                        @click="activePanelTab = 'counts'"
                      >
                        Counts {{ countProgress.complete }}/{{ countProgress.total }}
                      </button>
                    </div>

                    <div
                      v-show="activePanelTab === 'markers'"
                      class="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-2.5"
                      role="tabpanel"
                    >
                      <div class="min-w-0">
                        <div class="text-[11px] font-medium text-gray-500">
                          <span v-if="activeMarkerTab === 'breath'">Breath taken</span>
                          <span v-else-if="activeMarkerTab === 'stroke'">Stroke taken</span>
                          <span v-else>Next {{ activeMarkerTab === "surfacing" ? "surfacing" : "split" }} marker</span>
                        </div>
                        <div class="truncate text-xs font-semibold text-gray-800">
                          <span v-if="activeMarkerTab === 'breath'">
                            {{ breathMarkersEnabled ? "Add a breath marker at the current cursor" : "Complete splits first" }}
                          </span>
                          <span v-else-if="activeMarkerTab === 'stroke'">
                            {{ strokeMarkersEnabled ? "Add a stroke marker at the current cursor" : "Complete splits first" }}
                          </span>
                          <span v-else>
                            {{ activeNextMarker?.label || `All ${activeMarkerTab === "surfacing" ? "surfacing" : "split"} markers placed` }}
                          </span>
                        </div>
                      </div>

                      <button
                        class="h-10 min-w-[132px] rounded-md px-3 text-xs font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                        :class="activeMarkerTab === 'surfacing' ? 'bg-cyan-600 hover:bg-cyan-700' : activeMarkerTab === 'breath' ? 'bg-amber-500 hover:bg-amber-600' : activeMarkerTab === 'stroke' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'"
                        type="button"
                        :disabled="activeMarkerTab === 'breath' ? !isReady || !breathMarkersEnabled : activeMarkerTab === 'stroke' ? !isReady || !strokeMarkersEnabled : !isReady || !activeNextMarker"
                        @click="placeActiveMarkerAtCursor"
                      >
                        <span v-if="activeMarkerTab === 'breath'">Add at {{ formatVideoMsPrecise(currentVideoMs) }}</span>
                        <span v-else-if="activeMarkerTab === 'stroke'">Add at {{ formatVideoMsPrecise(currentVideoMs) }}</span>
                        <span v-else-if="activeNextMarker">Place at {{ formatVideoMsPrecise(currentVideoMs) }}</span>
                        <span v-else>Complete</span>
                      </button>
                    </div>

                    <div
                      v-show="activePanelTab === 'counts'"
                      class="mt-3 rounded-md border border-gray-200 bg-white p-3"
                      role="tabpanel"
                    >
                      <div class="mb-2 flex items-center justify-between gap-3">
                        <div class="text-xs font-semibold text-gray-700">Stroke markers per length</div>
                        <div class="text-[11px] text-gray-500">Calculated from stroke markers</div>
                      </div>

                      <div v-if="countRows.length" class="overflow-x-auto pb-2">
                        <table class="min-w-max border-separate border-spacing-0 overflow-hidden rounded-md border border-gray-200 text-xs">
                          <thead>
                            <tr class="bg-gray-50 text-gray-600">
                              <th
                                v-for="row in countRows"
                                :key="`heading-${row.id}`"
                                class="min-w-[140px] border-b border-gray-200 px-3 py-2 text-center font-semibold"
                              >
                                {{ row.label }}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td v-for="row in countRows" :key="`stroke-${row.id}`" class="border-l border-gray-100 p-2">
                                <div class="flex h-9 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900">
                                  {{ row.count || "-" }}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div v-else class="text-xs text-gray-500">
                        No count segments available for this race plan.
                      </div>
                    </div>

                    <div
                      v-show="activePanelTab === 'markers'"
                      class="mt-3"
                    >
                      <div
                        class="mb-3 grid rounded-md bg-gray-100 p-1"
                        :class="supportsBreathMarkers ? 'grid-cols-4' : 'grid-cols-3'"
                        role="tablist"
                        aria-label="Marker type"
                      >
                        <button
                          class="rounded px-3 py-2 text-xs font-semibold transition-colors"
                          :class="activeMarkerTab === 'surfacing' ? 'bg-white text-cyan-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                          type="button"
                          role="tab"
                          :aria-selected="activeMarkerTab === 'surfacing'"
                          @click="activeMarkerTab = 'surfacing'"
                        >
                          Surfacing {{ surfacingProgress.complete }}/{{ surfacingProgress.total }}
                        </button>

                        <button
                          class="rounded px-3 py-2 text-xs font-semibold transition-colors"
                          :class="activeMarkerTab === 'split' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                          type="button"
                          role="tab"
                          :aria-selected="activeMarkerTab === 'split'"
                          @click="activeMarkerTab = 'split'"
                        >
                          Splits {{ splitProgress.complete }}/{{ splitProgress.total }}
                        </button>

                        <button
                          class="rounded px-3 py-2 text-xs font-semibold transition-colors"
                          :class="activeMarkerTab === 'stroke' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                          type="button"
                          role="tab"
                          :aria-selected="activeMarkerTab === 'stroke'"
                          @click="activeMarkerTab = 'stroke'"
                        >
                          Strokes {{ strokeMarkerProgress.complete }}
                        </button>

                        <button
                          v-if="supportsBreathMarkers"
                          class="rounded px-3 py-2 text-xs font-semibold transition-colors"
                          :class="activeMarkerTab === 'breath' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                          type="button"
                          role="tab"
                          :aria-selected="activeMarkerTab === 'breath'"
                          @click="activeMarkerTab = 'breath'"
                        >
                          Breaths {{ breathMarkerProgress.complete }}
                        </button>
                      </div>

                      <div v-show="activeMarkerTab === 'stroke'" class="overflow-hidden border rounded-md bg-white" role="tabpanel">
                        <div class="px-3 py-2 text-xs font-semibold bg-gray-50">
                          Stroke markers
                        </div>

                        <div v-if="!strokeMarkersEnabled" class="border-t px-3 py-3 text-xs text-gray-500">
                          Complete split markers first so strokes can be assigned to the correct lengths.
                        </div>

                        <div v-else-if="strokeMarkerRows.length" class="flex overflow-x-auto border-t">
                          <div
                            v-for="marker in strokeMarkerRows"
                            :key="marker.id"
                            class="min-w-[180px] px-3 py-2 text-xs border-r last:border-r-0 flex items-center justify-between gap-3 bg-white"
                          >
                            <button
                              type="button"
                              class="flex-1 min-w-0 text-left"
                              @click="seekToMs(marker.tMs)"
                            >
                              <span class="block font-semibold">{{ marker.segment?.label ?? "Outside lengths" }}</span>
                              <span class="block tabular-nums text-gray-700">
                                {{ props.draft.startOffsetMs !== null ? formatRaceMs(toRaceMs(marker.tMs)) : formatVideoMsPrecise(marker.tMs) }}
                              </span>
                            </button>

                            <button
                              type="button"
                              class="shrink-0 text-red-600 hover:text-red-700 font-semibold text-sm leading-none px-1"
                              @click.stop="clearStrokeMarker(marker.id)"
                            >
                              x
                            </button>
                          </div>
                        </div>

                        <div v-else class="border-t px-3 py-3 text-xs text-gray-500">
                          No stroke markers added yet.
                        </div>
                      </div>

                      <div v-show="activeMarkerTab === 'surfacing'" class="overflow-hidden border rounded-md bg-white" role="tabpanel">
                        <div class="px-3 py-2 text-xs font-semibold bg-gray-50">
                          Surfacing markers
                        </div>

                        <div class="flex overflow-x-auto border-t">
                          <div
                            v-for="s in props.draft.surfaceSlots"
                            :key="s.id"
                            class="min-w-[220px] px-3 py-2 text-xs border-r last:border-r-0 flex items-center justify-between gap-3"
                            :class="s.id === props.draft.selectedSlotId ? 'bg-cyan-50' : 'bg-white'"
                          >
                            <button
                              type="button"
                              class="flex-1 min-w-0 flex items-center justify-between text-left"
                              @click="selectMarker(s.id)"
                            >
                              <span class="font-semibold">{{ s.label }}</span>
                              <span class="tabular-nums text-gray-700">
                                <span v-if="s.videoMs !== null && props.draft.startOffsetMs !== null">{{ formatRaceMs(toRaceMs(s.videoMs)) }}</span>
                                <span v-else-if="s.videoMs !== null">{{ formatRaceMs(s.videoMs) }}</span>
                              </span>
                            </button>

                            <button
                              v-if="s.videoMs !== null"
                              type="button"
                              class="shrink-0 text-red-600 hover:text-red-700 font-semibold text-sm leading-none px-1"
                              @click.stop="clearMarker(s.id)"
                            >
                              x
                            </button>
                          </div>
                        </div>
                      </div>

                      <div v-show="activeMarkerTab === 'split'" class="overflow-hidden border rounded-md bg-white" role="tabpanel">
                        <div class="px-3 py-2 text-xs font-semibold bg-gray-50">
                          Split markers
                        </div>

                        <div class="flex overflow-x-auto border-t">
                          <div
                            v-for="s in props.draft.splitSlots"
                            :key="s.id"
                            class="min-w-[220px] px-3 py-2 text-xs border-r last:border-r-0 flex items-center justify-between gap-3"
                            :class="s.id === props.draft.selectedSlotId ? 'bg-blue-50' : 'bg-white'"
                          >
                            <button
                              type="button"
                              class="flex-1 min-w-0 flex items-center justify-between text-left"
                              @click="selectMarker(s.id)"
                            >
                              <span class="font-semibold">{{ s.label }}</span>
                              <span class="tabular-nums text-gray-700">
                                <span v-if="s.videoMs !== null && props.draft.startOffsetMs !== null">{{ formatRaceMs(toRaceMs(s.videoMs)) }}</span>
                                <span v-else-if="s.videoMs !== null">{{ formatRaceMs(s.videoMs) }}</span>
                              </span>
                            </button>

                            <button
                              v-if="s.videoMs !== null && s.code !== 'finish_time'"
                              type="button"
                              class="shrink-0 text-red-600 hover:text-red-700 font-semibold text-sm leading-none px-1"
                              @click.stop="clearMarker(s.id)"
                            >
                              x
                            </button>
                          </div>
                        </div>
                      </div>

                      <div v-show="activeMarkerTab === 'breath'" class="overflow-hidden border rounded-md bg-white" role="tabpanel">
                        <div class="px-3 py-2 text-xs font-semibold bg-gray-50">
                          Breath markers
                        </div>

                        <div v-if="!breathMarkersEnabled" class="border-t px-3 py-3 text-xs text-gray-500">
                          Complete split markers first so breaths can be assigned to the correct lengths.
                        </div>

                        <div v-else-if="breathMarkerRows.length" class="flex overflow-x-auto border-t">
                          <div
                            v-for="marker in breathMarkerRows"
                            :key="marker.id"
                            class="min-w-[180px] px-3 py-2 text-xs border-r last:border-r-0 flex items-center justify-between gap-3 bg-white"
                          >
                            <button
                              type="button"
                              class="flex-1 min-w-0 text-left"
                              @click="seekToMs(marker.tMs)"
                            >
                              <span class="block font-semibold">{{ marker.segment?.label ?? "Outside lengths" }}</span>
                              <span class="block tabular-nums text-gray-700">
                                {{ props.draft.startOffsetMs !== null ? formatRaceMs(toRaceMs(marker.tMs)) : formatVideoMsPrecise(marker.tMs) }}
                              </span>
                            </button>

                            <button
                              type="button"
                              class="shrink-0 text-red-600 hover:text-red-700 font-semibold text-sm leading-none px-1"
                              @click.stop="clearBreathMarker(marker.id)"
                            >
                              x
                            </button>
                          </div>
                        </div>

                        <div v-else class="border-t px-3 py-3 text-xs text-gray-500">
                          No breath markers added yet.
                        </div>
                      </div>
                    </div>

                    <button
                      class="mt-4 w-full h-12 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      type="button"
                      :disabled="!canStop"
                      @click="emitStop"
                    >
                      Save &amp; continue
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t bg-white px-6 py-4">
      <div class="w-full max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div class="text-xs text-gray-600 truncate">
          Video: <span class="font-semibold">{{ props.video.originalName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .video-progress {
    height: 4px;
    appearance: none;
    border-radius: 9999px;
    background: linear-gradient(
      to right,
      rgb(255 255 255 / 95%) 0%,
      rgb(255 255 255 / 95%) var(--video-progress),
      rgb(255 255 255 / 45%) var(--video-progress),
      rgb(255 255 255 / 45%) 100%
    );
  }

  .video-progress::-webkit-slider-thumb {
    width: 12px;
    height: 12px;
    appearance: none;
    border: 0;
    border-radius: 9999px;
    background: white;
    opacity: 0;
    transition: opacity 150ms ease;
  }

  .video-progress::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: 0;
    border-radius: 9999px;
    background: white;
    opacity: 0;
    transition: opacity 150ms ease;
  }

  .video-progress:hover::-webkit-slider-thumb,
  .video-progress:focus-visible::-webkit-slider-thumb,
  .video-progress:hover::-moz-range-thumb,
  .video-progress:focus-visible::-moz-range-thumb {
    opacity: 1;
  }
</style>
