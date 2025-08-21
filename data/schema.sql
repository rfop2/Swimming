DROP TABLE IF EXISTS Session;
CREATE TABLE Session (
  id TEXT NOT NULL PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES User(id)
);
DROP TABLE IF EXISTS Qualifying;
CREATE TABLE "Qualifying" (
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
DROP TABLE IF EXISTS Performance;
CREATE TABLE "Performance" (  created DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  UNIQUE( created, swimmer, course, stroke, distance, area ),
  FOREIGN KEY (swimmer) REFERENCES "Swimmers"(id)
);
DROP TABLE IF EXISTS Results;
CREATE TABLE "Results"  (
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
  UNIQUE( swimmer, course, stroke, distance, date, round ),
  FOREIGN KEY (swimmer) REFERENCES "Swimmers"(id)
);
DROP TABLE IF EXISTS Rankings;
CREATE TABLE "Rankings" (
  created DATE NOT NULL,
  gender VARCHAR(16) NOT NULL,
  age VARCHAR(8) NOT NULL,
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
DROP TABLE IF EXISTS Individual;
CREATE TABLE Individual (
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
  UNIQUE(created, swimmer, course, stroke, distance),
  FOREIGN KEY (swimmer) REFERENCES "Swimmers"(id)
);
DROP TABLE IF EXISTS Locations;
CREATE TABLE "Locations" (
  created DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  location VARCHAR(32) NOT NULL PRIMARY KEY,
  latitude VARCHAR(16),
  longitude VARCHAR(16)
);
DROP TABLE IF EXISTS Meets;
CREATE TABLE "Meets" (
  created DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id VARCHAR(8) NOT NULL PRIMARY KEY,
  code VARCHAR(16) NOT NULL,
  date DATE NOT NULL,
  duration INTEGER NOT NULL,
  name TEXT NOT NULL,
  country VARCHAR(16) NOT NULL,
  region VARCHAR(16) NOT NULL,
  location VARCHAR(32) NOT NULL,
  course VARCHAR(8) NOT NULL,
  level INTEGER NOT NULL,
  type VARCHAR(16) NOT NULL
, contact VARCHAR(32), email VARCHAR(32));
DROP TABLE IF EXISTS User;
CREATE TABLE User (
  id TEXT NOT NULL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  firstName VARCHAR(32) NOT NULL,
  lastName VARCHAR(32) NOT NULL,
  location VARCHAR(32) NOT NULL DEFAULT "Malmesbury"
);
DROP TABLE IF EXISTS UserSwimmers;
CREATE TABLE UserSwimmers (
userId TEXT NOT NULL,
swimmerId VARCHAR(8) NOT NULL,
UNIQUE( userId, swimmerId ),
FOREIGN KEY (userId) REFERENCES "User"(id),
FOREIGN KEY (swimmerId) REFERENCES "Swimmers"(id)
);
DROP TABLE IF EXISTS Swimmers;
CREATE TABLE "Swimmers" (
  id VARCHAR(8) NOT NULL PRIMARY KEY,  name VARCHAR(32) NOT NULL,
  birthday DATE NOT NULL,
  gender VARCHAR(16) NOT NULL,
  nationality VARCHAR(16),
  region VARCHAR(16),
  county VARCHAR(16),
  active BOOLEAN NOT NULL DEFAULT 1
);
DROP INDEX IF EXISTS idx_swimmer;
CREATE INDEX idx_swimmer ON Performance ( swimmer );
DROP INDEX IF EXISTS idx_results_swimmer;
CREATE INDEX idx_results_swimmer ON Results ( swimmer );
DROP INDEX IF EXISTS idx_date_gender_age;
CREATE INDEX idx_date_gender_age ON Rankings( created, gender, age );
DROP INDEX IF EXISTS idx_date_gender_age_event;
CREATE INDEX idx_date_gender_age_event ON Rankings( created, gender, age, course, stroke, distance, area );
DROP VIEW IF EXISTS MeetsView;
CREATE VIEW MeetsView AS SELECT id, code, date, duration, name, country, region, Meets.location, latitude, longitude, course, level, type, contact, email FROM "Meets" LEFT JOIN "Locations" ON Meets.location = Locations.location
/* MeetsView(id,code,date,duration,name,country,region,location,latitude,longitude,course,level,type,contact,email) */;
DROP VIEW IF EXISTS UserSwimmersView;
CREATE VIEW UserSwimmersView AS SELECT userId, Swimmers.* FROM UserSwimmers INNER JOIN Swimmers ON (UserSwimmers.swimmerId = Swimmers.id)
/* UserSwimmersView(userId,id,name,birthday,age,gender,nationality,region,county,active) */;
