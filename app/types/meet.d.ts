import type { CourseType } from "lib"

interface MeetRaceResults {
  round: string
  time: number
  points: number
}

type MeetDistanceResults = Map<number, Array<MeetRaceResults>>

type MeetStrokeResults = Map<StrokeType, MeetDistanceResults>

interface MeetEventResults {
  id: number
  name: string
  venue: string
  level: number
  date: Temporal.PlainDate
  duration: number
  course: CourseType
  results: MeetStrokeResults
}
