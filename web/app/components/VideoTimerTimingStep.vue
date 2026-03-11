<script setup lang="ts">
  import type { PropType } from "vue"
  import { toRaw } from "vue"
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

  type NextActionKind = "surfacing" | "split" | null

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

  type TurnPlanItem = ReturnType<typeof buildTurnPlan>[number]

  const props = defineProps( {
    video: { type: Object as PropType<UploadedVideo>, required: true },
    selections: { type: Object as PropType<{ course: string; stroke: string; distance: string }>, required: true },
    swimmer: { type: Object as PropType<SwimmerRef>, required: false, default: null },
    meetId: { type: String, required: false, default: null },
    notes: { type: String, required: false, default: "" },
    initialOfficialFinishTime: { type: String, required: false, default: "" },
    resultLink: { type: Object as PropType<Record<string, string | null>>, required: true },
    draft: { type: Object as PropType<VideoTimerDraft>, required: true },
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

  const cloneDraft = () => structuredClone( toRaw( props.draft ) ) as VideoTimerDraft

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

  const markerPlanKey = ( item: Pick<MarkerPlanItem, "code" | "lengthIndex" | "turnIndex"> ) =>
    `${item.code}::${item.lengthIndex ?? "x"}::${item.turnIndex ?? "x"}`

  const strokePlanKey = ( item: Pick<PlanStrokeCountSlot, "lengthIndex" | "fromM" | "toM"> ) =>
    `${item.lengthIndex}::${item.fromM}::${item.toM}`

  const makeMarkerSlotsFromPlan = ( items: MarkerPlanItem[], currentSlots: MarkerSlot[] ): MarkerSlot[] =>
    items.map( item => {
      const existing = currentSlots.find( slot => markerPlanKey( slot ) === markerPlanKey( item ) )

      return {
        id: existing?.id ?? makeId(),
        seq: item.seq,
        type: item.type,
        code: item.code,
        label: item.label,
        lengthIndex: item.lengthIndex,
        turnIndex: item.turnIndex,
        videoMs: existing?.videoMs ?? null,
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
      sameStringArray( current.surfaceKeys, expected.surfaceKeys )
      && sameStringArray( current.splitKeys, expected.splitKeys )
      && sameStringArray( current.strokeCountKeys, expected.strokeCountKeys )
      && sameNumberArray( current.turnKeys, expected.turnKeys )

    if ( samePlan ) {
      if ( !props.draft.selectedSlotId ) {
        const firstId = [ ...props.draft.surfaceSlots, ...props.draft.splitSlots ][0]?.id ?? null
        if ( firstId ) {
          updateDraft( next => {
            next.selectedSlotId = firstId
          } )
        }
      }
      return
    }

    const nextSurfaceSlots = makeMarkerSlotsFromPlan( expected.surface, props.draft.surfaceSlots )
    const nextSplitSlots = makeMarkerSlotsFromPlan( expected.split, props.draft.splitSlots )
    const nextStrokeCountSlots = makeStrokeCountDraftSlots( expected.strokeCounts, props.draft.strokeCountSlots )
    const nextTurns = makeTurnDraftRows( expected.turns, props.draft.turns )
    const firstId = [ ...nextSurfaceSlots, ...nextSplitSlots ][0]?.id ?? null

    updateDraft( next => {
      next.finishVideoMs = null
      next.startOffsetMs = null
      next.surfaceSlots = nextSurfaceSlots.map( slot => ( { ...slot, videoMs: null, missed: false } ) )
      next.splitSlots = nextSplitSlots.map( slot => ( { ...slot, videoMs: slot.code === "finish_time" ? null : null, missed: false } ) )
      next.strokeCountSlots = nextStrokeCountSlots
      next.turns = nextTurns
      next.selectedSlotId = firstId
      next.markers = []
      next.breakoutStartM = 10
    } )
  }

  watch(
    () => [ props.selections.course, props.selections.distance ],
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

  const selectedSlot = computed( () => findSlotById( props.draft.selectedSlotId ) )

  const nextSurfaceSlot = computed( () => props.draft.surfaceSlots.find( s => !s.missed && s.videoMs === null ) ?? null )
  const nextSplitSlot = computed( () => props.draft.splitSlots.find( s => s.code !== "finish_time" && !s.missed && s.videoMs === null ) ?? null )

  const isSurfacingSelected = computed( () => {
    if ( !selectedSlot.value ) return true
    return selectedSlot.value.type === "surfacing"
  } )

  const isSplitSelected = computed( () => {
    if ( !selectedSlot.value ) return false
    return selectedSlot.value.type === "split"
  } )

  const primaryNextAction = computed<NextActionKind>( () => {
    if ( selectedSlot.value?.type === "surfacing" && nextSurfaceSlot.value ) return "surfacing"
    if ( selectedSlot.value?.type === "split" && nextSplitSlot.value ) return "split"
    if ( nextSurfaceSlot.value ) return "surfacing"
    if ( nextSplitSlot.value ) return "split"
    return null
  } )

  const secondaryNextAction = computed<NextActionKind>( () => {
    if ( primaryNextAction.value === "surfacing" && nextSplitSlot.value ) return "split"
    if ( primaryNextAction.value === "split" && nextSurfaceSlot.value ) return "surfacing"
    return null
  } )

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
  const showFinishEditor = ref( false )
  const finishSetupError = ref( "" )

  const dragging = ref<{ kind: "start" | "finish" | "marker"; id?: string } | null>( null )

  const finishVideoMs = computed( () => props.draft.finishVideoMs )
  const startOffsetMs = computed( () => props.draft.startOffsetMs )

  const hasFinishMarked = computed( () =>
    finishVideoMs.value !== null
    && startOffsetMs.value !== null
    && startOffsetMs.value >= 0
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

    const startOffset = finishMs - officialFinishMs.value

    if ( startOffset < 0 ) {
      return {
        ok: false as const,
        message: "Calculated race start falls before the beginning of the video. Move the finish position later in the video or check the official finish time.",
        startOffset: null,
      }
    }

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
    updateDraft( next => {
      next.selectedSlotId = id
    } )
    const selected = findSlotById( id )
    if ( selected?.videoMs !== null ) {
      seekToMs( selected.videoMs )
    }
  }

  const placeMarkerAtCursor = ( type: MarkerType ) => {
    if ( !isReady.value ) return

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

  const strokeCountsComplete = computed( () =>
    props.draft.strokeCountSlots.length > 0
    && props.draft.strokeCountSlots.every( slot => slot.count !== null && slot.count > 0 )
  )

  const canStop = computed( () =>
    isReady.value
    && props.draft.startOffsetMs !== null
    && props.draft.startOffsetMs >= 0
    && props.draft.finishVideoMs !== null
    && allMarkersPlaced.value
    && strokeCountsComplete.value
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

  const parseCountValue = ( raw: string ) => {
    const n = Number( raw )
    if ( !Number.isFinite( n ) || n <= 0 ) return null
    return Math.floor( n )
  }

  const updateStrokeCountValue = ( id: string, raw: string ) => {
    updateDraft( next => {
      const slot = next.strokeCountSlots.find( item => item.id === id ) ?? null
      if ( !slot ) return
      slot.count = parseCountValue( raw )
    } )
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
      <div class="flex flex-col items-center px-6 py-6">
        <div class="w-full max-w-5xl">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold text-gray-800">Timing mode</div>
            <button class="h-10 px-4 rounded-md bg-gray-200 text-gray-900" type="button" @click="onBack">
              Back
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div class="w-full">
              <div class="text-sm font-semibold text-gray-800 mb-2">Video</div>

              <div class="w-full rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
                <div class="p-3 text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                  <div><span class="font-semibold">Course:</span> {{ props.selections.course }}</div>
                  <div><span class="font-semibold">Stroke:</span> {{ props.selections.stroke }}</div>
                  <div><span class="font-semibold">Distance:</span> {{ props.selections.distance }}</div>
                </div>

                <div
                  class="bg-black flex items-center justify-center overflow-hidden"
                  :class="isPortrait ? 'h-[75vh] max-h-[720px]' : 'aspect-video max-h-[520px]'"
                >
                  <video
                    ref="videoEl"
                    preload="auto"
                    :src="props.video.playbackUrl"
                    controls
                    playsinline
                    class="object-contain max-w-full max-h-full"
                    :class="isPortrait ? 'h-full w-auto' : 'w-full h-full'"
                    @loadedmetadata="onLoadedMetadata"
                    @timeupdate="setCurrentFromVideo"
                    @seeked="setCurrentFromVideo"
                  />
                </div>

                <div class="px-3 pb-3">
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
                  </div>

                  <div class="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-green-700" /> Start</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-red-700" /> Finish</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-cyan-600" /> Surfacing</div>
                    <div class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-blue-600" /> Split</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="w-full">
              <div class="text-sm font-semibold text-gray-800 mb-2">Controls</div>

              <div class="w-full rounded-xl border border-gray-200 bg-white p-4">
                <template v-if="!hasFinishMarked">
                  <div class="mt-2">
                    <div class="text-xs font-semibold text-gray-700 mb-2">
                      Step 1: Find the exact finish moment
                    </div>

                    <div class="grid grid-cols-1 gap-3">
                      <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">
                          Official finish time
                        </label>

                        <input
                          v-model="officialFinishText"
                          type="text"
                          placeholder="e.g. 1:14.58"
                          class="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
                        >

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
                        <label class="block text-xs font-semibold text-gray-700 mb-1">
                          Official finish time
                        </label>

                        <input
                          v-model="officialFinishText"
                          type="text"
                          placeholder="e.g. 1:14.58"
                          class="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
                        >

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

                  <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-xs font-semibold text-gray-700">Current action</div>
                      <div class="text-[11px] font-medium text-gray-500 text-right">
                        <span v-if="primaryNextAction === 'surfacing' && nextSurfaceSlot">
                          Next: Surfacing ({{ nextSurfaceSlot.label }})
                        </span>
                        <span v-else-if="primaryNextAction === 'split' && nextSplitSlot">
                          Next: Split ({{ nextSplitSlot.label }})
                        </span>
                        <span v-else>
                          No pending markers
                        </span>
                        <span
                          v-if="secondaryNextAction === 'surfacing' && nextSurfaceSlot"
                          class="block text-gray-400"
                        >
                          Alt: Surfacing ({{ nextSurfaceSlot.label }})
                        </span>
                        <span
                          v-else-if="secondaryNextAction === 'split' && nextSplitSlot"
                          class="block text-gray-400"
                        >
                          Alt: Split ({{ nextSplitSlot.label }})
                        </span>
                      </div>
                    </div>

                    <div class="mt-2 grid grid-cols-1 gap-2">
                      <button
                        class="h-10 px-3 rounded-md text-left border disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                        :class="isSurfacingSelected ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-cyan-700 border-cyan-300'"
                        type="button"
                        :disabled="!isReady || !nextSurfaceSlot"
                        @click="placeMarkerAtCursor('surfacing')"
                      >
                        <span v-if="nextSurfaceSlot">Place next surfacing: {{ nextSurfaceSlot.label }}</span>
                        <span v-else>No pending surfacing markers</span>
                      </button>

                      <button
                        class="h-10 px-3 rounded-md text-left border disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                        :class="isSplitSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-300'"
                        type="button"
                        :disabled="!isReady || !nextSplitSlot"
                        @click="placeMarkerAtCursor('split')"
                      >
                        <span v-if="nextSplitSlot">Place next split: {{ nextSplitSlot.label }}</span>
                        <span v-else>No pending split markers</span>
                      </button>
                    </div>
                  </div>

                  <div class="mt-3 space-y-3">
                    <details class="border rounded-md bg-white" open>
                      <summary class="px-3 py-2 text-xs font-semibold bg-gray-50 cursor-pointer select-none">
                        Surfacing markers
                      </summary>

                      <div class="max-h-40 overflow-y-auto border-t">
                        <div
                          v-for="s in props.draft.surfaceSlots"
                          :key="s.id"
                          class="w-full px-3 py-2 text-xs border-b last:border-b-0 flex items-center justify-between gap-3"
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
                            ✕
                          </button>
                        </div>
                      </div>
                    </details>

                    <details class="border rounded-md bg-white" open>
                      <summary class="px-3 py-2 text-xs font-semibold bg-gray-50 cursor-pointer select-none">
                        Split markers
                      </summary>

                      <div class="max-h-56 overflow-y-auto border-t">
                        <div
                          v-for="s in props.draft.splitSlots"
                          :key="s.id"
                          class="w-full px-3 py-2 text-xs border-b last:border-b-0 flex items-center justify-between gap-3"
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
                            ✕
                          </button>
                        </div>
                      </div>
                    </details>
                  </div>

                  <div class="mt-4 rounded-md border border-gray-200 bg-white p-3">
                    <div class="text-xs font-semibold text-gray-700 mb-2">Stroke counts</div>

                    <div v-if="props.draft.strokeCountSlots.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        v-for="slot in props.draft.strokeCountSlots"
                        :key="slot.id"
                      >
                        <label class="block text-xs font-semibold text-gray-700 mb-1">
                          {{ slot.label }}
                        </label>

                        <input
                          :value="slot.count ?? ''"
                          class="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                          type="number"
                          min="1"
                          step="1"
                          inputmode="numeric"
                          @input="(event) => updateStrokeCountValue(slot.id, (event.target as HTMLInputElement).value)"
                        >
                      </div>
                    </div>

                    <div v-else class="text-xs text-gray-500">
                      No stroke count segments available for this race plan.
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

    <div class="border-t bg-white px-6 py-4">
      <div class="w-full max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div class="text-xs text-gray-600 truncate">
          Video: <span class="font-semibold">{{ props.video.originalName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>