interface Individual {
  course: string
  stroke: string
  time: number
  converted_time: number
  wa_pts: number
  date: string // Should be Date really
  meet: string
  venue: string
  licence: string
  level: number
}

type IndividualStats = Array<Individual>

interface RankingRow {
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

type RankingTable = Array<RankingRow>

interface RankingStats {
  position: number
  rank: number
  best: number
  time: number
  difference: number
}

interface Ranking {
  table: RankingTable
  stats?: RankingStats
}

interface PageInfo {
  label: string
  url: URL
  type: "individual" | "ranking"
}

type PageData = Array<PageInfo>
