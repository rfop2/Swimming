import { RankingStats, Result } from "./types.js"

export const createSwimmerSql =
`CREATE TABLE IF NOT EXISTS Swimmers (
  id VARCHAR(8) NOT NULL PRIMARY KEY,
  name VARCHAR(32),
  birthday DATE,
  gender VARCHAR(16)
);`

export const createIndividualSql =
`CREATE TABLE IF NOT EXISTS Individual (
  created DATE NOT NULL,
  swimmer VARCHAR(8) NOT NULL,
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
  UNIQUE(created, course, stroke, distance),
  FOREIGN KEY (swimmer) REFERENCES Swimmers(id)
);`

export const insertIndividualSql =
`INSERT OR IGNORE INTO Individual (
  created,
  swimmer,
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
  :swimmer,
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
  created DATE NOT NULL,
  course VARCHAR(8) NOT NULL,
  stroke VARCHAR(32),
  distance VARCHAR(8),
  area VARCHAR(16),
  rank INTEGER,
  swimmer VARCHAR(8),
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
  swimmer,
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
  :swimmer,
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
  created DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  swimmer VARCHAR(8) NOT NULL,
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
  UNIQUE( created, course, stroke, distance, area ),
  FOREIGN KEY (swimmer) REFERENCES Swimmers(id)
);`

export const deletePerformanceSql = "DELETE FROM Performance WHERE created = ? AND swimmer = ? AND course = ? AND stroke = ? AND distance = ? AND area = ?;"

export const insertPerformanceSql =
`INSERT INTO Performance (
  created,
  swimmer,
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
  :swimmer,
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

export interface ResultsRow extends Result {
  created: string
  course: string
  stroke: string
  distance: string
}

export const createResultsSql =
`CREATE TABLE IF NOT EXISTS Results (
  created DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  swimmer VARCHAR(8) NOT NULL,
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
  UNIQUE( course, stroke, distance, date, round ),
  FOREIGN KEY (swimmer) REFERENCES Swimmers(id)
);`

export const insertResultsSql =
`INSERT OR IGNORE INTO Results (
  created,
  swimmer,
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
  :swimmer,
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

export interface QualifyingRow {
  created: string
  year: number
  course: string
  stroke: string
  distance: string
  area: string
  gender: string
  age: string
  timeString: string
  time: number
}

export const createQualifyingSql =
`CREATE TABLE IF NOT EXISTS Qualifying (
  created DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  year INTEGER NOT NULL,
  course VARCHAR(8) NOT NULL,
  stroke VARCHAR(32) NOT NULL,
  distance VARCHAR(8) NOT NULL,
  area VARCHAR(16) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  age VARCHAR(8) NOT NULL,
  timeString VARCHAR(16) NOT NULL,
  time DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  UNIQUE( year, age, gender, course, stroke, distance, area )
);`
