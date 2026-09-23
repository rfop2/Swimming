import { layout7TestConfig } from "./layout7TestConfig"

export const layout30TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "both",
    scope: "county",
    area: "DVNW",
    type: "general",
    qualifyingStart: "2026-03-01",
    qualifyingEnd: "2026-12-16",
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
    { gender: "male", course: "sc", event: "Freestyle 50m", distance: "50m", stroke: "Freestyle", databaseStroke: "freestyle", age: "10", timeString: "41.20", time: 41.2 },
    { gender: "female", course: "lc", event: "Freestyle 100m", distance: "100m", stroke: "Freestyle", databaseStroke: "freestyle", age: "17+", timeString: "01:04.30", time: 64.3 },
    { gender: "male", course: "lc", event: "Butterfly 100m", distance: "100m", stroke: "Butterfly", databaseStroke: "butterfly", age: "11", timeString: "02:00.60", time: 120.6 },
    { gender: "female", course: "sc", event: "Individual Medley 100m", distance: "100m", stroke: "Individual Medley", databaseStroke: "individual_medley", age: "16", timeString: "01:19.00", time: 79 },
  ],
} as const
