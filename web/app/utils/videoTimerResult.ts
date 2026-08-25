import { secondsToTime } from "lib"

export interface VideoTimerResultSelection {
  swimmer: string
  course: string
  stroke: string
  distance: string
  seq: number
  date: string
  meet: string
  time: number
}

export const serializeVideoTimerResult = ( result: VideoTimerResultSelection ) => JSON.stringify( {
  swimmer: result.swimmer,
  course: result.course,
  stroke: result.stroke,
  distance: result.distance,
  seq: Number( result.seq ),
  date: result.date,
  meet: result.meet,
  time: Number( result.time ),
} )

export const parseVideoTimerResult = ( value: string | null | undefined ): VideoTimerResultSelection | null => {
  if ( !value ) return null

  try {
    const parsed = JSON.parse( value ) as Partial<VideoTimerResultSelection>
    const time = Number( parsed.time )
    const seq = Number( parsed.seq )

    if (
      !parsed.swimmer
      || !parsed.course
      || !parsed.stroke
      || !parsed.distance
      || !parsed.date
      || !parsed.meet
      || !Number.isInteger( seq )
      || !Number.isFinite( time )
      || time <= 0
    ) return null

    return {
      swimmer: String( parsed.swimmer ),
      course: String( parsed.course ),
      stroke: String( parsed.stroke ),
      distance: String( parsed.distance ),
      seq,
      date: String( parsed.date ),
      meet: String( parsed.meet ),
      time,
    }
  } catch {
    return null
  }
}

export const getVideoTimerResultState = ( value: string | null | undefined ) => {
  const result = parseVideoTimerResult( value )

  return {
    result,
    officialTime: result ? secondsToTime( result.time ) : "",
    officialTimeLocked: result !== null,
  }
}
