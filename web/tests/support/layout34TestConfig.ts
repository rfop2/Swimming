import { layout7TestConfig } from "./layout7TestConfig"

export const layout34TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2026,
    course: "both",
    scope: "regional",
    area: "L",
    type: "general",
    qualifyingStart: "2025-10-22",
    qualifyingEnd: "2026-10-21",
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
    { gender: "male", course: "lc", event: "Freestyle 50m", distance: "50m", databaseStroke: "freestyle", age: "10", timeString: "26.38", time: 26.38 },
    { gender: "female", course: "lc", event: "Breaststroke 200m", distance: "200m", databaseStroke: "breaststroke", age: "17+", timeString: "2:52.38", time: 172.38 },
    { gender: "male", course: "sc", event: "Butterfly 100m", distance: "100m", databaseStroke: "butterfly", age: "17+", timeString: "58.70", time: 58.7 },
    { gender: "female", course: "sc", event: "Individual Medley 100m", distance: "100m", databaseStroke: "individual_medley", age: "10", timeString: "1:10.00", time: 70 },
  ],
} as const
