export const createIndividualSql =
`CREATE TABLE IF NOT EXISTS Individual (
  created DATE,
  course TEXT,
  stroke TEXT,
  time DECIMAL(8,2),
  converted_time DECIMAL(8,2),
  wa_pts INTEGER,
  date DATE,
  meet TEXT,
  venue TEXT,
  licence TEXT,
  level INTEGER,
  UNIQUE(created, course, stroke)
);`

export const insertIndividualSql =
`INSERT OR IGNORE INTO Individual (
  created,
  course,
  stroke,
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
  label TEXT,
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

export const deleteRankingsSql = "DELETE FROM Rankings WHERE created = ? AND label = ?;"

export const insertRankingsSql =
`INSERT INTO Rankings (
  created,
  label,
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
  :label,
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
  label: string
}

export const createPerformanceSql =
`CREATE TABLE IF NOT EXISTS Performance (
  created DATE DEFAULT CURRENT_TIMESTAMP,
  label VARCHAR(32),
  position INT,
  rank INT,
  best DECIMAL(8,2),
  time DECIMAL(8,2),
  difference DECIMAL(8,2),
  UNIQUE( created, label )
);`

export const deletePerformanceSql = "DELETE FROM Performance WHERE created = ? AND label = ?;"

export const insertPerformanceSql =
`INSERT INTO Performance (
  created,
  label,
  position,
  rank,
  best,
  time,
  difference
) VALUES (
  :created,
  :label,
  :position,
  :rank,
  :best,
  :time,
  :difference
);`
