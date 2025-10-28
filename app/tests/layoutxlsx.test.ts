import { describe, it, expect } from "vitest"
import path from "path"
import fs from "fs"
import { parseSwimmingXlsx } from "../server/utils/parseSwimmingDocs"

describe( "Xlsx Swimming Parser", () => {
  it( "should parse Qualifying xlsx document", async () => {
    const xlsxPath = path.resolve( __dirname, "./data/2025-Devon-Championship-Qualifying-Times-V3.xlsx" )
    const buffer = fs.readFileSync( xlsxPath )

    const structured = parseSwimmingXlsx( buffer )
    const expectedResults = {
      "50m Freestyle": {
        male: [
          { age: "10", time: "42.00" },
          { age: "11", time: "42.00" },
          { age: "12", time: "37.60" },
          { age: "13", time: "35.60" },
          { age: "14", time: "33.10" },
          { age: "15", time: "30.20" },
          { age: "16", time: "29.00" },
          { age: "17+", time: "27.80" },
        ],
        female: [
          { age: "10", time: "43.50" },
          { age: "11", time: "43.50" },
          { age: "12", time: "36.20" },
          { age: "13", time: "35.10" },
          { age: "14", time: "32.90" },
          { age: "15", time: "31.00" },
          { age: "16", time: "30.10" },
          { age: "17+", time: "29.90" },
        ]
      },
      "100m Freestyle": {
        male: [
          { age: "10", time: "00:01:40" },
          { age: "11", time: "00:01:40" },
          { age: "12", time: "00:01:36" },
          { age: "13", time: "00:01:21" },
          { age: "14", time: "00:01:14" },
          { age: "15", time: "00:01:08" },
          { age: "16", time: "00:01:03" },
          { age: "17+", time: "00:01:00" },
        ],
        female: [
          { age: "10", time: "00:01:42" },
          { age: "11", time: "00:01:42" },
          { age: "12", time: "1.25.30" },
          { age: "13", time: "00:01:18" },
          { age: "14", time: "00:01:13" },
          { age: "15", time: "1.08.20" },
          { age: "16", time: "00:01:06" },
          { age: "17+", time: "00:01:05" },
        ]
      },
      "200m Freestyle": {
        male: [
          { age: "10", time: "00:03:56" },
          { age: "11", time: "00:03:56" },
          { age: "12", time: "00:03:25" },
          { age: "13", time: "00:03:04" },
          { age: "14", time: "2.48.10" },
          { age: "15", time: "00:02:32" },
          { age: "16", time: "00:02:25" },
          { age: "17+", time: "2.14.85" },
        ],
        female: [
          { age: "10", time: "00:03:58" },
          { age: "11", time: "00:03:58" },
          { age: "12", time: "00:03:04" },
          { age: "13", time: "00:02:53" },
          { age: "14", time: "00:02:41" },
          { age: "15", time: "00:02:30" },
          { age: "16", time: "00:02:29" },
          { age: "17+", time: "00:02:27" },
        ]
      },
      "400m Freestyle": {
        male: [
          { age: "10", time: "00:07:05" },
          { age: "11", time: "00:07:05" },
          { age: "12", time: "00:07:05" },
          { age: "13", time: "00:06:20" },
          { age: "14", time: "00:05:41" },
          { age: "15", time: "00:05:19" },
          { age: "16", time: "00:05:09" },
          { age: "17+", time: "00:04:45" },
        ],
        female: [
          { age: "10", time: "00:07:53" },
          { age: "11", time: "00:07:53" },
          { age: "12", time: "00:06:49" },
          { age: "13", time: "6.10.00" },
          { age: "14", time: "00:05:49" },
          { age: "15", time: "00:05:29" },
          { age: "16", time: "00:05:09" },
          { age: "17+", time: "00:05:19" },
        ]
      },
    }

    Object.entries( expectedResults ).forEach( ( [ eventName, genders ] ) => {
      [ "male", "female" ].forEach( gender => {
        genders[gender].forEach( expectedRecord => {
          const actualRecord = structured.find(
            r => r.event === eventName && r.gender === gender && r.age === expectedRecord.age
          )
          if ( !actualRecord ) {
            throw new Error(
              `Missing record for event ${eventName}, gender ${gender}, age ${expectedRecord.age}`
            )
          }
          try {
            expect( actualRecord.time ).toBe( expectedRecord.time )
          } catch ( err ) {
            throw new Error(
              `Failure in event ${eventName}, gender ${gender}, age ${expectedRecord.age}: ` +
              `expected time ${expectedRecord.time}, received ${actualRecord.time}`
            )
          }
        } )
      } )
    } )
  } )
} )
