CREATE TABLE IF NOT EXISTS "User" (
  id TEXT NOT NULL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "Session" (
  id TEXT NOT NULL PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES User(id)
);
CREATE TABLE IF NOT EXISTS "Individual" (
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
);
CREATE TABLE IF NOT EXISTS "Rankings" (
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
);
CREATE TABLE IF NOT EXISTS "Performance" (
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
);
CREATE TABLE IF NOT EXISTS "Results" (
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
);
CREATE TABLE IF NOT EXISTS "Swimmers" (
  id VARCHAR(8) NOT NULL PRIMARY KEY,
  name VARCHAR(32),
  birthday DATE,
  gender VARCHAR(16)
);
CREATE TABLE IF NOT EXISTS "Qualifying" (
  created DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  year INTEGER NOT NULL,
  course VARCHAR(8) NOT NULL,
  stroke VARCHAR(32) NOT NULL,
  distance VARCHAR(8) NOT NULL,
  area VARCHAR(16) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  age  VARCHAR(8) NOT NULL,
  timeString VARCHAR(16) NOT NULL,
  time DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  UNIQUE( year, age, gender, course, stroke, distance, area )
);
