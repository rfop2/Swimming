import { mysqlTable, varchar, int, text, date, decimal, tinyint } from "drizzle-orm/mysql-core"

export const Individual = mysqlTable( "Individual", {
  created: date( "created" ).notNull(),
  swimmer: varchar( "swimmer", { length: 8 } ).notNull().references( () => Swimmers.id ),
  course: varchar( "course", { length: 8 } ),
  stroke: varchar( "stroke", { length: 32 } ),
  distance: varchar( "distance", { length: 8 } ),
  time: decimal( "time", { precision: 8, scale: 2 } ),
  converted_time: decimal( "converted_time", { precision: 8, scale: 2 } ),
  wa_pts: int( "wa_pts" ),
  date: date( "date" ),
  meet: text( "meet" ),
  venue: text( "venue" ),
  licence: text( "licence" ),
  level: int( "level" ),
} )
// TODO: UNIQUE INDEX on columns: (idx_swimmer_record, created, swimmer, course, stroke, distance)
// TODO: INDEX on columns: (swimmer, swimmer)

export const Locations = mysqlTable( "Locations", {
  created: date( "created" ).notNull(),
  location: varchar( "location", { length: 32 } ).notNull().primaryKey(),
  latitude: varchar( "latitude", { length: 16 } ),
  longitude: varchar( "longitude", { length: 16 } ),
} )

export const Meets = mysqlTable( "Meets", {
  created: date( "created" ).notNull(),
  id: varchar( "id", { length: 8 } ).notNull().primaryKey(),
  code: varchar( "code", { length: 16 } ).notNull(),
  date: date( "date" ).notNull(),
  duration: int( "duration" ).notNull(),
  name: text( "name" ).notNull(),
  country: varchar( "country", { length: 16 } ).notNull(),
  region: varchar( "region", { length: 32 } ).notNull(),
  location: varchar( "location", { length: 32 } ).notNull(),
  course: varchar( "course", { length: 8 } ).notNull(),
  level: int( "level" ).notNull(),
  type: varchar( "type", { length: 16 } ).notNull(),
  contact: varchar( "contact", { length: 128 } ),
  email: varchar( "email", { length: 32 } ),
} )

export const Performance = mysqlTable( "Performance", {
  created: date( "created" ).notNull(),
  swimmer: varchar( "swimmer", { length: 8 } ).notNull().references( () => Swimmers.id ),
  course: varchar( "course", { length: 8 } ),
  stroke: varchar( "stroke", { length: 32 } ),
  distance: varchar( "distance", { length: 8 } ),
  scope: varchar( "scope", { length: 16 } ),
  area: varchar( "area", { length: 16 } ),
  position: int( "position" ),
  rank: int( "rank" ),
  best: decimal( "best", { precision: 8, scale: 2 } ),
  best_date: date( "best_date" ),
  time: decimal( "time", { precision: 8, scale: 2 } ),
  time_date: date( "time_date" ),
  difference: decimal( "difference", { precision: 8, scale: 2 } ),
} )
// TODO: UNIQUE INDEX on columns: (idx_swimmer_event_area, created, swimmer, course, stroke, distance, scope, area)
// TODO: INDEX on columns: (swimmer, swimmer)

export const Qualifying = mysqlTable( "Qualifying", {
  created: date( "created" ).notNull(),
  year: int( "year" ).notNull(),
  course: varchar( "course", { length: 8 } ).notNull(),
  stroke: varchar( "stroke", { length: 32 } ).notNull(),
  distance: varchar( "distance", { length: 8 } ).notNull(),
  scope: varchar( "scope", { length: 16 } ).notNull(),
  area: varchar( "area", { length: 16 } ).notNull(),
  gender: varchar( "gender", { length: 16 } ).notNull(),
  age: varchar( "age", { length: 8 } ).notNull(),
  timeString: varchar( "timeString", { length: 16 } ).notNull(),
  time: decimal( "time", { precision: 8, scale: 2 } ).notNull(),
} )
// TODO: UNIQUE INDEX on columns: (idx_qualifying, year, age, gender, course, stroke, distance, scope, area)

export const Rankings = mysqlTable( "Rankings", {
  created: date( "created" ).notNull(),
  gender: varchar( "gender", { length: 16 } ).notNull(),
  age: varchar( "age", { length: 8 } ).notNull(),
  course: varchar( "course", { length: 8 } ).notNull(),
  stroke: varchar( "stroke", { length: 32 } ),
  distance: varchar( "distance", { length: 8 } ),
  scope: varchar( "scope", { length: 16 } ),
  area: varchar( "area", { length: 16 } ),
  rank: int( "rank" ),
  swimmer: varchar( "swimmer", { length: 8 } ),
  name: text( "name" ),
  ranked_club: text( "ranked_club" ),
  yob: int( "yob" ),
  meet_name: text( "meet_name" ),
  venue: text( "venue" ),
  level: int( "level" ),
  date: date( "date" ),
  time: decimal( "time", { precision: 8, scale: 2 } ),
  fina: int( "fina" ),
} )

export const Results = mysqlTable( "Results", {
  created: date( "created" ).notNull(),
  swimmer: varchar( "swimmer", { length: 8 } ).notNull().references( () => Swimmers.id ),
  course: varchar( "course", { length: 8 } ),
  stroke: varchar( "stroke", { length: 32 } ),
  distance: varchar( "distance", { length: 8 } ),
  time: decimal( "time", { precision: 8, scale: 2 } ),
  wa_pts: int( "wa_pts" ),
  round: varchar( "round", { length: 8 } ),
  date: date( "date" ),
  meet: text( "meet" ),
  venue: text( "venue" ),
  club_swam_under: text( "club_swam_under" ),
  level: int( "level" ),
} )
// TODO: UNIQUE INDEX on columns: (idx_swimmer_event, swimmer, course, stroke, distance, date, round)
// TODO: INDEX on columns: (idx_results_swimmer, swimmer)

export const Session = mysqlTable( "Session", {
  id: varchar( "id", { length: 64 } ).notNull().primaryKey(),
  expires_at: int( "expires_at" ).notNull(),
  user_id: varchar( "user_id", { length: 16 } ).notNull().references( () => User.id ),
} )
// TODO: INDEX on columns: (user_id, user_id)

export const Swimmers = mysqlTable( "Swimmers", {
  id: varchar( "id", { length: 8 } ).notNull().primaryKey(),
  name: varchar( "name", { length: 32 } ).notNull(),
  birthday: date( "birthday" ).notNull(),
  gender: varchar( "gender", { length: 16 } ).notNull(),
  nationality: varchar( "nationality", { length: 16 } ),
  region: varchar( "region", { length: 16 } ),
  county: varchar( "county", { length: 16 } ),
  active: tinyint( "active" ).notNull(),
} )

export const User = mysqlTable( "User", {
  id: varchar( "id", { length: 16 } ).notNull().primaryKey(),
  username: varchar( "username", { length: 32 } ).notNull(),
  password_hash: text( "password_hash" ).notNull(),
  firstName: varchar( "firstName", { length: 32 } ).notNull(),
  lastName: varchar( "lastName", { length: 32 } ).notNull(),
  location: varchar( "location", { length: 32 } ).notNull(),
  type: varchar( "type", { length: 16 } ).notNull().references( () => UserTypes.type ),
  admin: int( "admin" ).notNull(),
} )
// TODO: UNIQUE INDEX on columns: (username, username)
// TODO: INDEX on columns: (type, type)

export const UserMeets = mysqlTable( "UserMeets", {
  userId: varchar( "userId", { length: 16 } ).notNull().primaryKey().references( () => User.id ),
  meetId: varchar( "meetId", { length: 8 } ).notNull().primaryKey().references( () => Meets.id ),
  swimmerId: varchar( "swimmerId", { length: 8 } ),
} )
// TODO: INDEX on columns: (idx_meetId, meetId)

export const UserSwimmers = mysqlTable( "UserSwimmers", {
  userId: varchar( "userId", { length: 16 } ).notNull().references( () => User.id ),
  swimmerId: varchar( "swimmerId", { length: 8 } ).notNull().references( () => Swimmers.id ),
} )
// TODO: UNIQUE INDEX on columns: (userId_swimmerId, userId, swimmerId)
// TODO: INDEX on columns: (swimmerId, swimmerId)

export const UserTypes = mysqlTable( "UserTypes", {
  type: varchar( "type", { length: 8 } ).notNull().primaryKey(),
  seq: int( "seq" ).notNull(),
} )
// TODO: UNIQUE INDEX on columns: (seq, seq)

// View UserSwimmersView
// SQL: select `UserSwimmers`.`userId` AS `userId`,`Swimmers`.`id` AS `id`,`Swimmers`.`name` AS `name`,`Swimmers`.`birthday` AS `birthday`,`Swimmers`.`gender` AS `gender`,`Swimmers`.`nationality` AS `nationality`,`Swimmers`.`region` AS `region`,`Swimmers`.`county` AS `county`,`Swimmers`.`active` AS `active` from (`UserSwimmers` join `Swimmers` on(`UserSwimmers`.`swimmerId` = `Swimmers`.`id`)) */
// You can use mysqlView("UserSwimmersView", { /* columns */ }) if needed.
export const UserSwimmersView = mysqlTable(
  "UserSwimmersView",
  {
    userId: varchar( "userId", { length: 16 } ).notNull().references( () => User.id ),
    id: varchar( "id", { length: 8 } ).notNull(),
    name: varchar( "name", { length: 32 } ).notNull(),
    birthday: date( "birthday" ).notNull(),
    gender: varchar( "gender", { length: 16 } ).notNull(),
    nationality: varchar( "nationality", { length: 16 } ),
    region: varchar( "region", { length: 16 } ),
    county: varchar( "county", { length: 16 } ),
    active: tinyint( "active" ).notNull(),
  },
)

export const schema = {
  Individual,
  Locations,
  Meets,
  Performance,
  Qualifying,
  Rankings,
  Results,
  Session,
  Swimmers,
  User,
  UserMeets,
  UserSwimmers,
  UserTypes,
  UserSwimmersView,
} as const
