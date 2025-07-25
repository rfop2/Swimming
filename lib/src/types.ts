export interface Swimmer {
  id: string
  name: string
  birthday: string
  age: string
  gender: string
  county: string
  region: string
}

export interface Individual {
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

export type IndividualStats = Array<Individual>

export interface RankingRow {
  rank: number
  name: string
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

export interface Result {
  time: number
  wa_pts: number
  round: string
  date: string
  meet: string
  venue: string
  club_swam_under: string
  level: number
}

export type Results = Array<Result>

export interface Meet {
  id: string
  code: string
  link: string
  date: string
  duration?: number
  name: string
  country: string
  region: string
  location?: string
  course: string
  level: number
  type: string
}

export type Meets = Array<Meet>

export interface PageInfo {
  label: string
  url: URL
  type: "individual" | "ranking" | "results" | "meets" | "meet"
}

export type PageData = Array<PageInfo>
