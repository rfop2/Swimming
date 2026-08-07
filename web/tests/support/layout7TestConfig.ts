import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parse } from "dotenv"

const dockerEnvPath = resolve( process.cwd(), "../docker/.env" )
const dockerEnv = existsSync( dockerEnvPath )
  ? parse( readFileSync( dockerEnvPath, "utf8" ) )
  : {}

const fromEnvironment = ( name: string, fallback = "" ) =>
  process.env[name] || dockerEnv[name] || fallback

export const layout7TestConfig = {
  database: {
    host: process.env.LAYOUT7_TEST_DB_HOST || "127.0.0.1",
    port: Number( process.env.LAYOUT7_TEST_DB_PORT || "3308" ),
    sourceName: process.env.LAYOUT7_SOURCE_DATABASE || dockerEnv.MARIADB_DATABASE || "swimming",
    name: process.env.LAYOUT7_TEST_DATABASE || "swimming_layout7_test",
    user: fromEnvironment( "MARIADB_USER", "swimming" ),
    password: fromEnvironment( "MARIADB_PASSWORD" ),
    rootPassword: fromEnvironment( "MARIADB_ROOT_PASSWORD" ),
  },
  admin: {
    id: "layout7testadmin",
    username: "layout7.test@example.invalid",
    password: "Layout7-Test-Only-2027!",
  },
  import: {
    year: 2027,
    scope: "county" as const,
    area: "BSBS",
    type: "general" as const,
    course: "sc" as const,
    qualifyingStart: "2025-12-20",
    qualifyingEnd: "2026-12-21",
    // The PDF does not state the race date; this is an explicit E2E test value.
    lastRaceDate: "2027-12-31",
  },
  sentinel: {
    timeString: "99.99",
    time: 99.99,
    qualifyingStart: "2000-01-01",
    qualifyingEnd: "2000-01-02",
    lastRaceDate: "2000-01-03",
  },
  expected: {
    gender: "female",
    age: "10",
    stroke: "freestyle",
    distance: "50m",
    timeString: "37.5",
    time: 37.5,
  },
} as const
