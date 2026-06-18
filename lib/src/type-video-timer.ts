import { buildLapPlan, buildRaceStructure, buildStrokeCountSlots, buildTurnPlan } from "./plan.js"
import type {
  FinishAnalysis,
  LapAnalysisRow,
  StartAnalysis,
  SwimFreeAnalysisRow,
  SwimFreeSummary,
  TurnAnalysisRow,
  VideoTimerComputedAnalysis,
  VideoTimerMarkerRecord,
  VideoTimerBreathCountRecord,
  VideoTimerSessionComputationInput,
  VideoTimerStrokeCountRecord,
  VideoTimerTurnAnalysisRecord,
} from "./analysis.js"

import type { StrokeCountSlot as PlanStrokeCountSlot, LapPlanItem, TurnPlanItem } from "./plan.js"
import type { MarkerPlanItem } from "./markers.js"

export type VideoTimerDraftMarkerSlot = MarkerPlanItem & {
  id: string
  videoMs: number | null
  missed: boolean
}

export type VideoTimerDraftStrokeCountSlot = PlanStrokeCountSlot & {
  id: string
  count: number | null
}

export type VideoTimerDraftBreathCountSlot = PlanStrokeCountSlot & {
  id: string
  count: number | null
}

export type VideoTimerDraft = {
  finishVideoMs: number | null
  startOffsetMs: number | null
  surfaceSlots: VideoTimerDraftMarkerSlot[]
  splitSlots: VideoTimerDraftMarkerSlot[]
  strokeCountSlots: VideoTimerDraftStrokeCountSlot[]
  breathCountSlots: VideoTimerDraftBreathCountSlot[]
  turns: VideoTimerTurnAnalysisRecord[]
  selectedSlotId: string | null
  markers: VideoTimerMarkerRecord[]
  breakoutStartM: number | null
  breakoutTurnM: number | null
}



const toRaceMs = ( videoMs: number | null | undefined, startOffsetMs: number | null | undefined ) => {
  if ( videoMs === null || videoMs === undefined || startOffsetMs === null || startOffsetMs === undefined ) return null
  return Math.max( 0, Math.round( videoMs - startOffsetMs ) )
}

const deltaMs = ( endMs: number | null | undefined, startMs: number | null | undefined ) => {
  if ( endMs === null || endMs === undefined || startMs === null || startMs === undefined ) return null
  return Math.max( 0, Math.round( endMs - startMs ) )
}

const average = ( values: Array<number | null | undefined> ) => {
  const valid = values.filter( ( value ): value is number => typeof value === "number" && Number.isFinite( value ) )
  if ( !valid.length ) return null
  return valid.reduce( ( sum, value ) => sum + value, 0 ) / valid.length
}

const total = ( values: Array<number | null | undefined> ) => {
  const valid = values.filter( ( value ): value is number => typeof value === "number" && Number.isFinite( value ) )
  if ( !valid.length ) return null
  return valid.reduce( ( sum, value ) => sum + value, 0 )
}

const calcSpeed = ( distanceM: number, timeMs: number | null ) => {
  if ( timeMs === null || timeMs <= 0 ) return null
  return distanceM / ( timeMs / 1000 )
}

const calcDps = ( distanceM: number, count: number | null | undefined ) => {
  if ( count === null || count === undefined || count <= 0 ) return null
  return distanceM / count
}

const calcSr = ( count: number | null | undefined, timeMs: number | null ) => {
  if ( count === null || count === undefined || count <= 0 || timeMs === null || timeMs <= 0 ) return null
  return count / ( timeMs / 60000 )
}

const findMarker = (
  markers: VideoTimerMarkerRecord[],
  code: string,
  options: {
    turnIndex?: number | null
    lengthIndex?: number | null
  } = {}
) => {
  const turnIndex = options.turnIndex ?? null
  const lengthIndex = options.lengthIndex ?? null

  return markers.find( marker =>
    marker.code === code
    && ( turnIndex === null ? true : marker.turnIndex === turnIndex )
    && ( lengthIndex === null ? true : marker.lengthIndex === lengthIndex )
  ) ?? null
}

const mapStrokeCountsByLength = ( rows: VideoTimerStrokeCountRecord[] ) =>
  new Map<number, VideoTimerStrokeCountRecord>( rows.map( row => [ row.lengthIndex, row ] ) )

const mapBreathCountsByLength = ( rows: VideoTimerBreathCountRecord[] ) =>
  new Map<number, VideoTimerBreathCountRecord>( rows.map( row => [ row.lengthIndex, row ] ) )

const mapTurnsByIndex = ( rows: VideoTimerTurnAnalysisRecord[] ) =>
  new Map<number, VideoTimerTurnAnalysisRecord>( rows.map( row => [ row.turnIndex, row ] ) )

export const buildVideoTimerComputedAnalysis = (
  input: VideoTimerSessionComputationInput
): VideoTimerComputedAnalysis => {
  const race = buildRaceStructure( input.course, input.distance )
  const lapPlan = buildLapPlan( input.course, input.distance )
  const turnPlan = buildTurnPlan( input.course, input.distance )
  const strokePlan = buildStrokeCountSlots( input.course, input.distance )

  const strokeCountMap = mapStrokeCountsByLength( input.strokeCounts )
  const breathCountMap = mapBreathCountsByLength( input.breathCounts )
  const turnMap = mapTurnsByIndex( input.turns )

  const finishTimeMs = toRaceMs( findMarker( input.markers, "finish_time" )?.tMs ?? null, input.startOffsetMs )

  let previousLapEndMs: number | null = null

  const laps: LapAnalysisRow[] = lapPlan.map( ( lap: LapPlanItem ) => {
    const lapEndMs =
      lap.index < race.lengthCount
        ? toRaceMs(
            findMarker( input.markers, "hit_pad", { turnIndex: lap.index } )?.tMs ?? null,
            input.startOffsetMs
          )
        : finishTimeMs

    const splitMs = previousLapEndMs === null ? lapEndMs : deltaMs( lapEndMs, previousLapEndMs )
    const pct =
      splitMs !== null && finishTimeMs !== null && finishTimeMs > 0
        ? ( splitMs / finishTimeMs ) * 100
        : null

    previousLapEndMs = lapEndMs

    return {
      lengthIndex: lap.index,
      fromM: lap.fromM,
      toM: lap.toM,
      label: lap.label,
      splitMs,
      cumulativeMs: lapEndMs,
      pct,
    }
  } )

  const tenMs = toRaceMs( findMarker( input.markers, "m10", { lengthIndex: 1 } )?.tMs ?? null, input.startOffsetMs )
  const breakoutMs = toRaceMs( findMarker( input.markers, "breakout_start", { lengthIndex: 1 } )?.tMs ?? null, input.startOffsetMs )

  const start: StartAnalysis = {
    tenMs,
    breakoutM: input.analysis?.breakoutStartM ?? null,
    breakoutMs,
  }

  const turns: TurnAnalysisRow[] = turnPlan.map( ( turn: TurnPlanItem ) => {
    const hitPadMs = toRaceMs(
      findMarker( input.markers, "hit_pad", { turnIndex: turn.turnIndex } )?.tMs ?? null,
      input.startOffsetMs
    )

    const beforeTurn5Ms = toRaceMs(
      findMarker( input.markers, "before_turn_5", { turnIndex: turn.turnIndex } )?.tMs ?? null,
      input.startOffsetMs
    )

    const afterTurn10Ms = toRaceMs(
      findMarker( input.markers, "after_turn_10", { turnIndex: turn.turnIndex } )?.tMs ?? null,
      input.startOffsetMs
    )

    const breakoutAfterTurnMs = toRaceMs(
      findMarker( input.markers, "breakout_after_turn", { turnIndex: turn.turnIndex } )?.tMs ?? null,
      input.startOffsetMs
    )

    const turnAnalysis = turnMap.get( turn.turnIndex ) ?? null

    return {
      turnIndex: turn.turnIndex,
      atM: turn.atM,
      label: turn.label,
      fiveInMs: deltaMs( hitPadMs, beforeTurn5Ms ),
      tenOutMs: deltaMs( afterTurn10Ms, hitPadMs ),
      breakoutM: turnAnalysis?.breakoutM ?? null,
      breakoutMs: deltaMs( breakoutAfterTurnMs, hitPadMs ),
    }
  } )

  const beforeFinish5Ms = toRaceMs(
    findMarker( input.markers, "before_finish_5", { lengthIndex: race.lengthCount } )?.tMs ?? null,
    input.startOffsetMs
  )

  const finish: FinishAnalysis = {
    fiveInMs: deltaMs( finishTimeMs, beforeFinish5Ms ),
  }

  const swimFreeRows: SwimFreeAnalysisRow[] = strokePlan.map( ( slot: PlanStrokeCountSlot ) => {
    const startMs =
      slot.lengthIndex === 1
        ? toRaceMs(
            findMarker( input.markers, "m10", { lengthIndex: 1 } )?.tMs ?? null,
            input.startOffsetMs
          )
        : toRaceMs(
            findMarker( input.markers, "after_turn_10", { turnIndex: slot.lengthIndex - 1 } )?.tMs ?? null,
            input.startOffsetMs
          )

    const endMs =
      slot.lengthIndex < race.lengthCount
        ? toRaceMs(
            findMarker( input.markers, "hit_pad", { turnIndex: slot.lengthIndex } )?.tMs ?? null,
            input.startOffsetMs
          )
        : finishTimeMs

    const timeMs = deltaMs( endMs, startMs )
    const distanceM = Number( ( slot.toM - slot.fromM ).toFixed( 2 ) )
    const savedStroke = strokeCountMap.get( slot.lengthIndex ) ?? null
    const savedBreath = breathCountMap.get( slot.lengthIndex ) ?? null
    const count = savedStroke?.count ?? null
    const breathCount = savedBreath?.count ?? null

    return {
      lengthIndex: slot.lengthIndex,
      fromM: slot.fromM,
      toM: slot.toM,
      label: `${slot.fromM} - ${slot.toM} m`,
      distanceM,
      timeMs,
      count,
      breathCount,
      dps: calcDps( distanceM, count ),
      sr: calcSr( count, timeMs ),
      speed: calcSpeed( distanceM, timeMs ),
    }
  } )

  const swimFree: SwimFreeSummary = {
    rows: swimFreeRows,
    averageTimeMs: average( swimFreeRows.map( row => row.timeMs ) ),
    averageStrokeCount: average( swimFreeRows.map( row => row.count ) ),
    averageBreathCount: average( swimFreeRows.map( row => row.breathCount ) ),
    averageDps: average( swimFreeRows.map( row => row.dps ) ),
    averageSr: average( swimFreeRows.map( row => row.sr ) ),
    averageSpeed: average( swimFreeRows.map( row => row.speed ) ),
    totalStrokeCount: total( swimFreeRows.map( row => row.count ) ),
    totalBreathCount: total( swimFreeRows.map( row => row.breathCount ) ),
  }

  return {
    finishTimeMs,
    laps,
    start,
    turns,
    finish,
    swimFree,
  }
}
