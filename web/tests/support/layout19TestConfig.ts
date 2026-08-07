import { layout7TestConfig } from "./layout7TestConfig"

export const layout19TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "WLTW",
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
      timeString: "43.50",
      time: 43.5,
    },
    {
      gender: "male",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "17+",
      timeString: "1:00.00",
      time: 60,
    },
    {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      databaseStroke: "individual_medley",
      age: "15",
      timeString: "2:55.00",
      time: 175,
    },
  ],
} as const
