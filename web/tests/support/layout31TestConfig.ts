import { layout7TestConfig } from "./layout7TestConfig"

export const layout31TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "CHRN",
    type: "general",
    qualifyingStart: "2026-01-01",
    qualifyingEnd: "2026-12-09",
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
    { gender: "male", event: "Freestyle 50m", distance: "50m", stroke: "Freestyle", databaseStroke: "freestyle", age: "10", timeString: "36.50", time: 36.5 },
    { gender: "female", event: "Backstroke 200m", distance: "200m", stroke: "Backstroke", databaseStroke: "backstroke", age: "13", timeString: "02:49.00", time: 169 },
    { gender: "female", event: "Freestyle 800m", distance: "800m", stroke: "Freestyle", databaseStroke: "freestyle", age: "17+", timeString: "10:20.00", time: 620 },
    { gender: "male", event: "Breaststroke 100m", distance: "100m", stroke: "Breaststroke", databaseStroke: "breaststroke", age: "15", timeString: "01:25.00", time: 85 },
  ],
} as const
