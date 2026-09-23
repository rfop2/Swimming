import { layout7TestConfig } from "./layout7TestConfig"

export const layout29TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "CWLW",
    type: "general",
    qualifyingStart: "2026-03-01",
    qualifyingEnd: "2027-01-16",
    lastRaceDate: null,
  },
  sentinel: {
    timeString: "99.99",
    time: 99.99,
    qualifyingStart: "2001-01-01",
    qualifyingEnd: "2001-01-02",
    lastRaceDate: "2001-01-03",
  },
  samples: [
    { gender: "male", event: "Freestyle 50m", distance: "50m", stroke: "Freestyle", databaseStroke: "freestyle", age: "10", timeString: "40.08", time: 40.08 },
    { gender: "female", event: "Breaststroke 200m", distance: "200m", stroke: "Breaststroke", databaseStroke: "breaststroke", age: "12", timeString: "03:39.3", time: 219.3 },
    { gender: "female", event: "Individual Medley 200m", distance: "200m", stroke: "Individual Medley", databaseStroke: "individual_medley", age: "17+", timeString: "02:37.0", time: 157 },
  ],
} as const
