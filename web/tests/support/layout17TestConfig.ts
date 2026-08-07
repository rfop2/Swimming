import { layout7TestConfig } from "./layout7TestConfig"

export const layout17TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    scope: "county",
    area: "SRYQ",
    type: "general",
  },
  sentinel: {
    timeString: "99.99",
    time: 99.99,
  },
  samples: [
    {
      gender: "male",
      course: "lc",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "10",
      timeString: "33.81",
      time: 33.81,
    },
    {
      gender: "male",
      course: "sc",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "18+",
      timeString: "52.20",
      time: 52.2,
    },
    {
      gender: "female",
      course: "lc",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      databaseStroke: "individual_medley",
      age: "14",
      timeString: "2:38.00",
      time: 158,
    },
  ],
} as const
