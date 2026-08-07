import { layout7TestConfig } from "./layout7TestConfig"

export const layout14TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "lc",
    scope: "county",
    area: "NRFT",
    type: "general",
  },
  sentinel: {
    timeString: "99.99",
    time: 99.99,
  },
  samples: [
    {
      gender: "male",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "10",
      timeString: "41.52",
      time: 41.52,
    },
    {
      gender: "male",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "17+",
      timeString: "58.40",
      time: 58.4,
    },
    {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      databaseStroke: "individual_medley",
      age: "13",
      timeString: "3:01.75",
      time: 181.75,
    },
  ],
} as const
