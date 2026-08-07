import { layout7TestConfig } from "./layout7TestConfig"

export const layout18TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "WWKM",
    type: "general",
  },
  sentinel: {
    timeString: "99.99",
    time: 99.99,
  },
  samples: [
    {
      gender: "female",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "10",
      timeString: "40.0",
      time: 40,
    },
    {
      gender: "male",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "18+",
      timeString: "58.9",
      time: 58.9,
    },
    {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      databaseStroke: "individual_medley",
      age: "14",
      timeString: "2:51.5",
      time: 171.5,
    },
  ],
} as const
