import { layout7TestConfig } from "./layout7TestConfig"

export const layout21TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "NHPA",
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
      timeString: "0:47.3",
      time: 47.3,
    },
    {
      gender: "female",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      databaseStroke: "breaststroke",
      age: "12",
      timeString: "3:55.0",
      time: 235,
    },
    {
      gender: "female",
      event: "Individual Medley 200m",
      distance: "200m",
      stroke: "Individual Medley",
      databaseStroke: "individual_medley",
      age: "16+",
      timeString: "3:14.8",
      time: 194.8,
    },
  ],
} as const
