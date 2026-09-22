import { layout7TestConfig } from "./layout7TestConfig"

export const layout28TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "STFM",
    type: "general",
    qualifyingStart: "2026-04-01",
    qualifyingEnd: "2027-01-13",
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
    { gender: "male", event: "Freestyle 50m", distance: "50m", stroke: "Freestyle", databaseStroke: "freestyle", age: "10", timeString: "00:40.0", time: 40 },
    { gender: "female", event: "Breaststroke 200m", distance: "200m", stroke: "Breaststroke", databaseStroke: "breaststroke", age: "12", timeString: "03:44.2", time: 224.2 },
    { gender: "female", event: "Individual Medley 200m", distance: "200m", stroke: "Individual Medley", databaseStroke: "individual_medley", age: "17+", timeString: "02:41.5", time: 161.5 },
  ],
} as const
