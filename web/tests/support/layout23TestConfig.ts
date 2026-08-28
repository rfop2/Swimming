import { layout7TestConfig } from "./layout7TestConfig"

export const layout23TestConfig = {
  database: layout7TestConfig.database,
  admin: layout7TestConfig.admin,
  import: {
    year: 2027,
    course: "sc",
    scope: "county",
    area: "CUMN",
    type: "general",
  },
  sentinel: { timeString: "99.99", time: 99.99 },
  samples: [
    {
      gender: "female",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "10",
      timeString: "50.89",
      time: 50.89,
    },
    {
      gender: "male",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      databaseStroke: "freestyle",
      age: "16+",
      timeString: "27.39",
      time: 27.39,
    },
    {
      gender: "female",
      event: "Breaststroke 200m",
      distance: "200m",
      stroke: "Breaststroke",
      databaseStroke: "breaststroke",
      age: "12",
      timeString: "4:15.89",
      time: 255.89,
    },
  ],
} as const
