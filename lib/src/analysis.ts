import type { MarkerType } from "./markers.js"

export type VideoTimerMarkerRecord = {
  id?: string
  seq?: number
  type: MarkerType
  code: string
  label: string
  lengthIndex: number | null
  turnIndex: number | null
  tMs: number
}

export type VideoTimerSessionAnalysisRecord = {
  breakoutStartM: number | null
}

export type VideoTimerStrokeCountRecord = {
  lengthIndex: number
  fromM: number
  toM: number
  count: number | null
}

export type VideoTimerBreathCountRecord = {
  lengthIndex: number
  fromM: number
  toM: number
  count: number | null
}

export type VideoTimerTurnAnalysisRecord = {
  turnIndex: number
  breakoutM: number | null
}

export type VideoTimerSessionComputationInput = {
  course: string
  distance: string
  startOffsetMs: number | null
  markers: VideoTimerMarkerRecord[]
  analysis: VideoTimerSessionAnalysisRecord | null
  strokeCounts: VideoTimerStrokeCountRecord[]
  breathCounts: VideoTimerBreathCountRecord[]
  turns: VideoTimerTurnAnalysisRecord[]
}

export type LapAnalysisRow = {
  lengthIndex: number
  fromM: number
  toM: number
  label: string
  splitMs: number | null
  cumulativeMs: number | null
  pct: number | null
}

export type StartAnalysis = {
  tenMs: number | null
  breakoutM: number | null
  breakoutMs: number | null
}

export type TurnAnalysisRow = {
  turnIndex: number
  atM: number
  label: string
  fiveInMs: number | null
  tenOutMs: number | null
  breakoutM: number | null
  breakoutMs: number | null
}

export type FinishAnalysis = {
  fiveInMs: number | null
}

export type SwimFreeAnalysisRow = {
  lengthIndex: number
  fromM: number
  toM: number
  label: string
  distanceM: number
  timeMs: number | null
  count: number | null
  breathCount: number | null
  dps: number | null
  sr: number | null
  speed: number | null
}

export type SwimFreeSummary = {
  rows: SwimFreeAnalysisRow[]
  averageTimeMs: number | null
  averageStrokeCount: number | null
  averageBreathCount: number | null
  averageDps: number | null
  averageSr: number | null
  averageSpeed: number | null
  totalStrokeCount: number | null
  totalBreathCount: number | null
}

export type VideoTimerComputedAnalysis = {
  finishTimeMs: number | null
  laps: LapAnalysisRow[]
  start: StartAnalysis
  turns: TurnAnalysisRow[]
  finish: FinishAnalysis
  swimFree: SwimFreeSummary
}
