import { layout7TestConfig } from "./layout7TestConfig"

export const layout32TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2026,
    course: "sc",
    scope: "regional",
    area: "T",
    type: "general",
    qualifyingStart: "2025-01-01",
    qualifyingEnd: "2026-04-14",
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
    { gender: "female", event: "Freestyle 50m", distance: "50m", stroke: "Freestyle", databaseStroke: "freestyle", age: "11", timeString: "31.80", time: 31.8 },
    { gender: "male", event: "Freestyle 1500m", distance: "1500m", stroke: "Freestyle", databaseStroke: "freestyle", age: "13", timeString: "20:40.00", time: 1240 },
    { gender: "male", event: "Backstroke 100m", distance: "100m", stroke: "Backstroke", databaseStroke: "backstroke", age: "14", timeString: "01:11.50", time: 71.5 },
    { gender: "female", event: "Individual Medley 400m", distance: "400m", stroke: "Individual Medley", databaseStroke: "individual_medley", age: "17+", timeString: "05:25.00", time: 325 },
  ],
} as const
