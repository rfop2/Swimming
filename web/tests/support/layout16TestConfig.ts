import { layout7TestConfig } from "./layout7TestConfig"

export const layout16TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "LECA",
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
      timeString: "42.50",
      time: 42.5,
    },
    {
      gender: "female",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "16+",
      timeString: "1:09.90",
      time: 69.9,
    },
    {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      databaseStroke: "individual_medley",
      age: "13",
      timeString: "3:05.80",
      time: 185.8,
    },
  ],
} as const
