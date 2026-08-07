import { layout7TestConfig } from "./layout7TestConfig"

export const layout15TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "lc",
    scope: "county",
    area: "SFKT",
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
      timeString: "00:41.4",
      time: 41.4,
    },
    {
      gender: "male",
      event: "Freestyle 100m",
      distance: "100m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "17+",
      timeString: "01:01.6",
      time: 61.6,
    },
    {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      databaseStroke: "individual_medley",
      age: "13",
      timeString: "03:16.8",
      time: 196.8,
    },
  ],
} as const
