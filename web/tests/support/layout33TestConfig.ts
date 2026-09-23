import { layout7TestConfig } from "./layout7TestConfig"

export const layout33TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "ESXQ",
    type: "general",
    qualifyingStart: "2025-12-20",
    qualifyingEnd: "2026-12-18",
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
    { gender: "male", event: "Freestyle 50m", distance: "50m", databaseStroke: "freestyle", age: "10", timeString: "00:36.14", time: 36.14 },
    { gender: "female", event: "Freestyle 200m", distance: "200m", databaseStroke: "freestyle", age: "16", timeString: "00:25.65", time: 25.65 },
    { gender: "male", event: "Backstroke 100m", distance: "100m", databaseStroke: "backstroke", age: "17", timeString: "01:32.32", time: 92.32 },
    { gender: "female", event: "Individual Medley 400m", distance: "400m", databaseStroke: "individual_medley", age: "18+", timeString: "06:01.75", time: 361.75 },
  ],
} as const
