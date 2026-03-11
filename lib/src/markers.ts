import { buildRaceStructure } from "./plan.js"

export type MarkerType = "surfacing" | "split"

export type MarkerPlanItem = {
  seq: number
  type: MarkerType
  code: string
  label: string
  lengthIndex: number | null
  turnIndex: number | null
}

export type MarkerPlan = {
  surface: MarkerPlanItem[]
  split: MarkerPlanItem[]
  all: MarkerPlanItem[]
}

type BuildSplitOptions = {
  includeFinish?: boolean
}

const pushItem = (
  items: MarkerPlanItem[],
  type: MarkerType,
  code: string,
  label: string,
  lengthIndex: number | null,
  turnIndex: number | null
) => {
  items.push( {
    seq: items.length + 1,
    type,
    code,
    label,
    lengthIndex,
    turnIndex,
  } )
}

export const buildSurfaceMarkerPlan = ( course: string, distance: string ): MarkerPlanItem[] => {
  const race = buildRaceStructure( course, distance )
  const items: MarkerPlanItem[] = []

  pushItem( items, "surfacing", "breakout_start", "Break out", 1, null )

  for ( let turnIndex = 1; turnIndex <= race.turnCount; turnIndex++ ) {
    pushItem(
      items,
      "surfacing",
      "breakout_after_turn",
      race.turnCount === 1 ? "Break out after turn" : `Break out after turn ${turnIndex}`,
      turnIndex + 1,
      turnIndex
    )
  }

  return items
}

export const buildSplitMarkerPlan = (
  course: string,
  distance: string,
  options: BuildSplitOptions = {}
): MarkerPlanItem[] => {
  const race = buildRaceStructure( course, distance )
  const items: MarkerPlanItem[] = []
  const includeFinish = options.includeFinish === true

  pushItem( items, "split", "m10", "10m", 1, null )

  for ( let turnIndex = 1; turnIndex <= race.turnCount; turnIndex++ ) {
    pushItem(
      items,
      "split",
      "before_turn_5",
      race.turnCount === 1 ? "5m before turn" : `5m before turn ${turnIndex}`,
      turnIndex,
      turnIndex
    )

    pushItem(
      items,
      "split",
      "hit_pad",
      race.turnCount === 1 ? "Hit pad" : `Hit pad ${turnIndex}`,
      turnIndex,
      turnIndex
    )

    pushItem(
      items,
      "split",
      "after_turn_10",
      race.turnCount === 1 ? "10m after turn" : `10m after turn ${turnIndex}`,
      turnIndex + 1,
      turnIndex
    )
  }

  pushItem( items, "split", "before_finish_5", "5m before finish", race.lengthCount, null )
  pushItem( items, "split", "finish_time", "Finish time", race.lengthCount, null )

  if ( includeFinish ) {
    pushItem( items, "split", "finish", "Finish", race.lengthCount, null )
  }

  return items
}

export const buildMarkerPlan = (
  course: string,
  distance: string,
  options: BuildSplitOptions = {}
): MarkerPlan => {
  const surface = buildSurfaceMarkerPlan( course, distance )
  const split = buildSplitMarkerPlan( course, distance, options )

  const all = [ ...surface, ...split ].map( ( item, index ) => ( {
    ...item,
    seq: index + 1,
  } ) )

  return {
    surface,
    split,
    all,
  }
}