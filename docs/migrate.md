# Database Migrations

## Migrate to v2.1.1

Add active column to Swimmers table.

```SQL
ALTER TABLE Swimmers ADD COLUMN active BOOLEAN NOT NULL DEFAULT 1;
```

Create swimmers view.

```SQL
CREATE VIEW IF NOT EXISTS SwimmersView AS SELECT id, name, birthday, strftime('%Y', 'now') - strftime('%Y', birthday ) AS age, gender, active FROM Swimmers;
```

Update Performance table

```SQL
CREATE TABLE Performance2 (  created DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  FOREIGN KEY (swimmer) REFERENCES Swimmers(id)
);
INSERT INTO Performance2 SELECT * FROM Performance;
DROP TABLE Performance;
ALTER TABLE Performance2 RENAME TO Performance;
CREATE index idx_swimmer ON Performance ( swimmer );
```

Update Results table

```SQL
CREATE TABLE Results2  (
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
  FOREIGN KEY (swimmer) REFERENCES Swimmers(id)
);
INSERT INTO Results2 SELECT * FROM Results;
DROP TABLE Results;
ALTER TABLE Results2 RENAME TO Results;
CREATE INDEX idx_results_swimmer ON Results ( swimmer );
```

Update Rankings table

```SQL
CREATE TABLE Rankings2 (
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
INSERT INTO Rankings2 SELECT created, "female", 11, course, stroke, distance, area, rank, swimmer, name, ranked_club, yob, meet_name, venue, level, date, time, fina FROM Rankings;
DROP TABLE Rankings;
ALTER TABLE Rankings2 RENAME TO Rankings;
CREATE INDEX idx_date_gender_age ON Rankings( created, gender, age );
CREATE INDEX idx_date_gender_age_event ON Rankings( created, gender, age, course, stroke, distance, area );
```
