import { layout7TestConfig } from "./layout7TestConfig"

export const layout27TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "HRTT",
    type: "general",
    qualifyingStart: "2026-05-16",
    qualifyingEnd: "2026-12-06",
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
    { gender: "male", event: "Freestyle 50m", distance: "50m", stroke: "Freestyle", databaseStroke: "freestyle", age: "10", timeString: "00:35.00", time: 35 },
    { gender: "female", event: "Breaststroke 200m", distance: "200m", stroke: "Breaststroke", databaseStroke: "breaststroke", age: "12", timeString: "03:20.48", time: 200.48 },
    { gender: "female", event: "Individual Medley 200m", distance: "200m", stroke: "Individual Medley", databaseStroke: "individual_medley", age: "16+", timeString: "02:33.72", time: 153.72 },
  ],
} as const
