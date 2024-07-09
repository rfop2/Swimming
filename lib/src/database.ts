import { RankingStats } from "./types.js"

export const createIndividualSql =
`CREATE TABLE IF NOT EXISTS Individual (
  created DATE,
  course VARCHAR(8),
  stroke VARCHAR(32),
  distance VARCHAR(8),
  time DECIMAL(8,2),
  converted_time DECIMAL(8,2),
  wa_pts INTEGER,
  date DATE,
  meet TEXT,
  venue TEXT,
  licence TEXT,
  level INTEGER,
  UNIQUE(created, course, stroke, distance)
);`

export const insertIndividualSql =
`INSERT OR IGNORE INTO Individual (
  created,
  course,
  stroke,
  distance,
  time,
  converted_time,
  wa_pts,
  date,
  meet,
  venue,
  licence,
  level
) VALUES (
  :created,
  :course,
  :stroke,
  :distance,
  :time,
  :converted_time,
  :wa_pts,
  :date,
  :meet,
  :venue,
  :licence,
  :level
);`

export const createRankingsSql =
`CREATE TABLE IF NOT EXISTS Rankings (
  created DATE,
  course VARCHAR(8),
  stroke VARCHAR(32),
  distance VARCHAR(8),
  area VARCHAR(16),
  rank INTEGER,
  name TEXT,
  ranked_club TEXT,
  yob INTEGER,
  meet_name TEXT,
  venue TEXT,
  level INTEGER,
  date DATE,
  time DECIMAL(8,2),
  fina INTEGER
);`

export const deleteRankingsSql = "DELETE FROM Rankings WHERE created = ? AND course = ? AND stroke = ? AND distance = ? AND area = ?;"

export const insertRankingsSql =
`INSERT INTO Rankings (
  created,
  course,
  stroke,
  distance,
  area,
  rank,
  name,
  ranked_club,
  yob,
  meet_name,
  venue,
  level,
  date,
  time,
  fina
) VALUES (
  :created,
  :course,
  :stroke,
  :distance,
  :area,
  :rank,
  :name,
  :ranked_club,
  :yob,
  :meet_name,
  :venue,
  :level,
  :date,
  :time,
  :fina
);`

export interface PerformanceRow extends RankingStats {
  created: string
  course: string
  stroke: string
  distance: string
  area: string
}

export const createPerformanceSql =
`CREATE TABLE IF NOT EXISTS Performance (
  created DATE DEFAULT CURRENT_TIMESTAMP,
  course VARCHAR(8),
  stroke VARCHAR(32),
  distance VARCHAR(8),
  area VARCHAR(16),
  position INT,
  rank INT,
  best DECIMAL(8,2),
  best_date DATE,
  time DECIMAL(8,2),
  time_date DATE,
  difference DECIMAL(8,2),
  UNIQUE( created, course, stroke, distance, area )
);`

export const deletePerformanceSql = "DELETE FROM Performance WHERE created = ? AND course = ? AND stroke = ? AND distance = ? AND area = ?;;"

export const insertPerformanceSql =
`INSERT INTO Performance (
  created,
  course,
  stroke,
  distance,
  area,
  position,
  rank,
  best,
  best_date,
  time,
  time_date,
  difference
) VALUES (
  :created,
  :course,
  :stroke,
  :distance,
  :area,
  :position,
  :rank,
  :best,
  :best_date,
  :time,
  :time_date,
  :difference
);`

export const createResultsSql =
`CREATE TABLE IF NOT EXISTS Results (
  created DATE DEFAULT CURRENT_TIMESTAMP,
  course VARCHAR(8),
  stroke VARCHAR(32),
  distance VARCHAR(8),
  time DECIMAL(8,2),
  wa_pts INTEGER,
  round VARCHAR(8),
  date DATE,
  meet TEXT,
  venue TEXT,
  club_swam_under TEXT,
  level INTEGER,
  UNIQUE( course, stroke, distance, date, round )
);`

export const insertResultsSql =
`INSERT OR IGNORE INTO Results (
  created,
  course,
  stroke,
  distance,
  time,
  wa_pts,
  round,
  date,
  meet,
  venue,
  club_swam_under,
  level
) VALUES (
  :created,
  :course,
  :stroke,
  :distance,
  :time,
  :wa_pts,
  :round,
  :date,
  :meet,
  :venue,
  :club_swam_under,
  :level
);`
