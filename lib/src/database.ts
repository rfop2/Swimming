import { RankingStats, Result } from "./types.js"

export interface PerformanceRow extends RankingStats {
  created: string
  course: string
  stroke: string
  distance: string
  scope: string
  area: string
}

export interface ResultsRow extends Result {
  created: string
  course: string
  stroke: string
  distance: string
}

export interface QualifyingRow {
  created: string
  year: number
  course: string
  stroke: string
  distance: string
  scope: string
  area: string
  gender: string
  age: string
  timeString: string
  time: number
}

export const insertMeetsSql =
`INSERT INTO Meets (
  created,
  id,
  code,
  date,
  duration,
  name,
  country,
  region,
  location,
  course,
  level,
  type,
  contact,
  email
)
VALUES (
  :created,
  :id,
  :code,
  :date,
  :duration,
  :name,
  :country,
  :region,
  :location,
  :course,
  :level,
  :type,
  :contact,
  :email
)
ON CONFLICT(id) DO UPDATE SET
  code      = excluded.code,
  date      = excluded.date,
  duration  = excluded.duration,
  name      = excluded.name,
  country   = excluded.country,
  region    = excluded.region,
  location  = excluded.location,
  course    = excluded.course,
  level     = excluded.level,
  type      = excluded.type,
  contact   = excluded.contact,
  email     = excluded.email
;`

export const insertLocationsSql =
`INSERT INTO Locations (
  created,
  location,
  latitude,
  longitude
)
VALUES (
  :created,
  :location,
  :latitude,
  :longitude
);`
