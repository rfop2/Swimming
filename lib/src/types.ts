export interface DatabaseUser {
  id: string
  username: string
  password_hash: string
  firstName: string
  lastName: string
  phone: string
  location: string
  locationId?: number
  type: string
  admin: boolean
  created?: string
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
  active: number
  lastUpdateTime?: Date
  lastUpdateType?: string
}

export interface ExtSwimmer extends Swimmer {
  clubId?: Club["clubId"]
  clubIds: string
  rankedClub?: number
  rankedClubs: string
  squad?: string
  squads: string
}

export const scopeTypes = [ "regional", "county" ] as const
export type ScopeType = typeof scopeTypes[number]

export const courseTypes = [ "lc", "sc" ] as const
export type CourseType = typeof courseTypes[number]

export const strokeTypes = [ "freestyle", "breaststroke", "butterfly", "backstroke", "individual_medley" ] as const
export type StrokeType = typeof strokeTypes[number]

export const distanceTypes = [ "50m", "100m", "150m", "200m", "400m", "800m", "1500m" ] as const
export type DistanceType = typeof distanceTypes[number]

export const genderTypes = [ "male", "female" ] as const
export type GenderType = typeof genderTypes[number]

export interface IndividualStats {
  course: CourseType
  stroke: StrokeType
  distance: DistanceType
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
  course: CourseType
  stroke: StrokeType
  distance: DistanceType
  scope: ScopeType
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
  course: CourseType
  stroke: StrokeType
  distance: DistanceType
  created: string
}

export interface Club {
  clubId: string
  clubName: string
  clubAlias?: string
  clubRegion: string
  clubCounty: string
  meetName: string
}

export type RequireOne<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>
export type Optionalize<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type KeepRequired<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>

export interface UserClub extends KeepRequired<Club, "clubId"> {
  clubOwner: number
}

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
  locationId: number | null
  latitude: number | null
  longitude: number | null
  course: CourseType
  level: number
  type: string
  contact?: string
  email?: string
  tagged: number
}

export interface MeetResults {
  id: number
  code: string
  name: string
  city: string
  type: string
  date: string
  course: CourseType
  link: string
  level: number
}

export interface PageInfo {
  label: string
  url: URL
  referrer?: URL,
  type: "individual" | "ranking" | "results" | "meets" | "meet" | "meetsResults" | "meetResults"
  data?: unknown
}

export type PageData = Array<PageInfo>

export interface QualifyingRow {
  year: number
  course: CourseType
  stroke: StrokeType
  distance: DistanceType
  scope: ScopeType
  area: string
  type: QualifyingType
  gender: GenderType
  age: string
  timeString: string
  time: number
}

export const qualifyingTypes = [ "general", "winter", "summer" ] as const
export type QualifyingType = typeof qualifyingTypes[number]

export interface QualifyingPeriodRow {
  year: number
  scope: ScopeType
  area: string
  type: QualifyingType
  qualifyingStart: string
  qualifyingEnd?: string
  eligibilityStart: string
  eligibilityEnd?: string
  notes?: string
}

export interface ExtQualifyingPeriod extends QualifyingPeriodRow {
  qualifyingStarted: boolean
  qualifyingEnded: boolean
  qualifyingActive: boolean
  eligibilityStarted: boolean
  eligibilityEnded: boolean
  eligibilityActive: boolean
}

export interface Task {
  taskId: number
  creatorId?: string
  creatorName?: string
  taskType: string
  taskOptions?: string
  taskDescription?: string
  targetType: string
  targetId?: string
  taskSchedule?: string
  taskStatus?: string
  taskResult?: string
  startTime?: string | null
  endTime?: string | null
  created?: string
  updated?: string
}

export type SwimmerUpdateType = "individual" | "results" | "rankings"
export type SwimmerUpdateMode = "force" | "smart" | "lazy"

export const notificationTypes = [ "info", "success", "warn", "error" ] as const
export type NotificationType = typeof notificationTypes[number]

export interface Notification {
  notificationId: number
  notificationCreatorId: string
  notificationTargetId: string
  notificationType: NotificationType
  notificationText: string
  created?: string
  updated?: string
}

export interface UserNotification extends Notification {
  notificationViewed: number
}

export const typedKeys = <T extends object>( obj: T ): Array<keyof T> => Object.keys( obj ) as Array<keyof T>
