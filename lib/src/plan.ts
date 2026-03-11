// race structure

export type VideoTimerCourse = "sc" | "lc"

export type RaceStructure = {
  course: VideoTimerCourse
  distanceText: string
  distanceM: number
  poolLengthM: 25 | 50
  lengthCount: number
  turnCount: number
}

export type LapPlanItem = {
  index: number
  fromM: number
  toM: number
  label: string
}

export type StrokeCountSlot = {
  lengthIndex: number
  fromM: number
  toM: number
  label: string
}

export type TurnPlanItem = {
  turnIndex: number
  atM: number
  inFromM: number
  inToM: number
  outFromM: number
  outToM: number
  label: string
}

const formatMeters = ( value: number ) => Number.isInteger( value ) ? String( value ) : value.toFixed( 2 )

export const normaliseCourse = ( course: string ): VideoTimerCourse => {
  const value = String( course || "" ).trim().toLowerCase()

  if ( value === "sc" ) return "sc"
  if ( value === "lc" ) return "lc"

  throw new Error( `Unsupported course: ${course}` )
}

export const parseDistanceM = ( distance: string ): number => {
  const value = Number( String( distance || "" ).replace( /[^\d.]/g, "" ) )

  if ( !Number.isFinite( value ) || value <= 0 ) {
    throw new Error( `Invalid distance: ${distance}` )
  }

  return Math.round( value )
}

export const getPoolLengthM = ( course: string ): 25 | 50 => {
  const normalised = normaliseCourse( course )
  return normalised === "sc" ? 25 : 50
}

export const getLengthCount = ( course: string, distance: string ): number => {
  const distanceM = parseDistanceM( distance )
  const poolLengthM = getPoolLengthM( course )

  if ( distanceM % poolLengthM !== 0 ) {
    throw new Error( `Distance ${distanceM} is not compatible with pool length ${poolLengthM}` )
  }

  return Math.round( distanceM / poolLengthM )
}

export const getTurnCount = ( course: string, distance: string ): number =>
  Math.max( 0, getLengthCount( course, distance ) - 1 )

export const buildRaceStructure = ( course: string, distance: string ): RaceStructure => {
  const normalisedCourse = normaliseCourse( course )
  const distanceM = parseDistanceM( distance )
  const poolLengthM = getPoolLengthM( normalisedCourse )

  if ( distanceM % poolLengthM !== 0 ) {
    throw new Error( `Distance ${distanceM} is not compatible with pool length ${poolLengthM}` )
  }

  const lengthCount = Math.round( distanceM / poolLengthM )
  const turnCount = Math.max( 0, lengthCount - 1 )

  return {
    course: normalisedCourse,
    distanceText: distance,
    distanceM,
    poolLengthM,
    lengthCount,
    turnCount,
  }
}

export const buildLapPlan = ( course: string, distance: string ): LapPlanItem[] => {
  const race = buildRaceStructure( course, distance )

  return Array.from( { length: race.lengthCount }, ( _, index ) => {
    const fromM = index * race.poolLengthM
    const toM = ( index + 1 ) * race.poolLengthM

    return {
      index: index + 1,
      fromM,
      toM,
      label: `${formatMeters( fromM )} - ${formatMeters( toM )} m`,
    }
  } )
}

export const buildStrokeCountSlots = ( course: string, distance: string ): StrokeCountSlot[] => {
  const race = buildRaceStructure( course, distance )

  return Array.from( { length: race.lengthCount }, ( _, index ) => {
    const lengthIndex = index + 1
    const startBoundary = index * race.poolLengthM
    const endBoundary = ( index + 1 ) * race.poolLengthM
    const fromM = lengthIndex === 1 ? 10 : startBoundary + 10
    const toM = endBoundary

    return {
      lengthIndex,
      fromM,
      toM,
      label: `Count ${formatMeters( fromM )} - ${formatMeters( toM )}m`,
    }
  } )
}

export const buildTurnPlan = ( course: string, distance: string ): TurnPlanItem[] => {
  const race = buildRaceStructure( course, distance )

  return Array.from( { length: race.turnCount }, ( _, index ) => {
    const turnIndex = index + 1
    const atM = turnIndex * race.poolLengthM

    return {
      turnIndex,
      atM,
      inFromM: atM - 5,
      inToM: atM,
      outFromM: atM,
      outToM: atM + 10,
      label: `Turn ${turnIndex} (${formatMeters( atM )}m)`,
    }
  } )
}