interface MeetRaceResults {
  round: string
  time: number
  points: number
}

type MeetDistanceResults = Map<number, Array<MeetRaceResults>>

type MeetStrokeResults = Map<string, MeetDistanceResults>

interface MeetResults {
  id: number
  name: string
  venue: string
  level: number
  date: Temporal.PlainDate
  duration: number
  course: string
  results: MeetStrokeResults
}
