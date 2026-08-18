import { layout7TestConfig } from "./layout7TestConfig"

export const layout22TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "LNCN",
    type: "general",
  },
  sentinel: { timeString: "99.99", time: 99.99 },
  samples: [
    {
      gender: "male",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "10",
      timeString: "36.59",
      time: 36.59,
    },
    {
      gender: "female",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      databaseStroke: "breaststroke",
      age: "12",
      timeString: "3:25.59",
      time: 205.59,
    },
    {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      databaseStroke: "individual_medley",
      age: "17+",
      timeString: "2:37.59",
      time: 157.59,
    },
  ],
} as const
