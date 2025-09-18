export interface DatabaseUser {
  id: string
  username: string
  password_hash: string
  firstName: string
  lastName: string
  location: string
  type: string
  admin: boolean
  created?: Date
}

export interface Swimmer {
  id: string
  fullName?: string
  firstName: string
  lastName: string
  birthday: string
  gender: string
  nationality: string
  region: string
  county: string
  squad: string
  active: number
}

export interface IndividualStats {
  course: string
  stroke: string
  distance: string
  time: number
  converted_time: number
  wa_pts: number
  date: string // Should be Date really
  meet: string
  venue: string
  licence: string
  level: number
}

export interface IndividualRow extends IndividualStats {
  swimmer: string
}

export interface RankingRow {
  position: number
  rank: number
  name: string
  swimmer: string
  ranked_club: string
  yob: number
  meet_name: string
  venue: string
  level: number
  date: string // Should be Date really
  time: number
  fina: number
}

export type RankingTable = Array<RankingRow>

export interface RankingStats {
  position: number
  rank: number
  best: number
  best_date: string
  time: number
  time_date: string
  difference: number
}

export interface Ranking {
  table: RankingTable
  stats?: RankingStats
}

export interface PerformanceRow extends RankingStats {
  created: string
  course: string
  stroke: string
  distance: string
  scope: string
  area: string
}

export interface ResultData {
  time: number
  wa_pts: number
  round: string
  date: string
  meet: string
  venue: string
  club_swam_under: string
  level: number
}

export type Results = Array<ResultData>

export interface ResultsRow extends ResultData {
  created: string
  course: string
  stroke: string
  distance: string
}

export type LatLon = { latitude: number, longitude: number }

export interface Meet {
  id: string
  code: string
  link: string
  date: string
  duration: number
  name: string
  country: string
  region: string
  location: string
  latitude: number | null
  longitude: number | null
  course: string
  level: number
  type: string
  contact?: string
  email?: string
  tagged: number
}

export interface PageInfo {
  label: string
  url: URL
  referrer?: URL,
  type: "individual" | "ranking" | "results" | "meets" | "meet"
  data?: unknown
}

export type PageData = Array<PageInfo>

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
