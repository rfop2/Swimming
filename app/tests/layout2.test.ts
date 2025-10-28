import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import pdf from "pdf-parse/lib/pdf-parse.js"
import { parseSwimmingPdfLayout2 } from "../server/utils/parseSwimmingDocs"

describe( "PDF Swimming Parser", () => {
  it( "should parse Qualifying documentt", async () => {
    const pdfPath = path.resolve( __dirname, "./data/2026-Qualifying-times.pdf" )
    const buffer = fs.readFileSync( pdfPath )
    const data = await pdf( buffer )

    const expectedResults = {
      "50m Freestyle": {
        male: [
          { age: "10", time: "41.00" },
          { age: "11", time: "41.00" },
          { age: "12", time: "40.00" },
          { age: "13", time: "38.00" },
          { age: "14", time: "33.00" },
          { age: "15", time: "32.00" },
          { age: "16", time: "30.00" },
          { age: "17+", time: "27.10" },
        ],
        female: [
          { age: "10", time: "41.00" },
          { age: "11", time: "41.00" },
          { age: "12", time: "39.50" },
          { age: "13", time: "34.50" },
          { age: "14", time: "33.50" },
          { age: "15", time: "32.00" },
          { age: "16", time: "32.00" },
          { age: "17+", time: "29.80" },
        ]
      },
      "100m Freestyle": {
        male: [
          { age: "10", time: "1:41.00" },
          { age: "11", time: "1:41.00" },
          { age: "12", time: "1:30.00" },
          { age: "13", time: "1:22.00" },
          { age: "14", time: "1:11.00" },
          { age: "15", time: "1:10.00" },
          { age: "16", time: "1:06.00" },
          { age: "17+", time: "58.70" },
        ],
        female: [
          { age: "10", time: "1:38.00" },
          { age: "11", time: "1:38.00" },
          { age: "12", time: "1:30.50" },
          { age: "13", time: "1:16.50" },
          { age: "14", time: "1:11.00" },
          { age: "15", time: "1:09.00" },
          { age: "16", time: "1:09.00" },
          { age: "17+", time: "1:04.70" },
        ]
      },
      "200m Freestyle": {
        male: [
          { age: "10", time: "3:30.00" },
          { age: "11", time: "3:30.00" },
          { age: "12", time: "3:05.00" },
          { age: "13", time: "2:55.00" },
          { age: "14", time: "2:38.00" },
          { age: "15", time: "2:32.00" },
          { age: "16", time: "2:20.00" },
          { age: "17+", time: "2:11.50" },
        ],
        female: [
          { age: "10", time: "3:43.00" },
          { age: "11", time: "3:43.00" },
          { age: "12", time: "3:05.00" },
          { age: "13", time: "2:37.00" },
          { age: "14", time: "2:30.00" },
          { age: "15", time: "2:30.00" },
          { age: "16", time: "2:30.00" },
          { age: "17+", time: "2:22.00" },
        ]
      },
      "400m Freestyle": {
        male: [
          { age: "10", time: "7:30.00" },
          { age: "11", time: "7:30.00" },
          { age: "12", time: "7:00.00" },
          { age: "13", time: "6:15.00" },
          { age: "14", time: "5:40.00" },
          { age: "15", time: "5:35.00" },
          { age: "16", time: "5:00.00" },
          { age: "17+", time: "4:45.00" },
        ],
        female: [
          { age: "10", time: "7:16.00" },
          { age: "11", time: "7:16.00" },
          { age: "12", time: "6:35.00" },
          { age: "13", time: "5:48.00" },
          { age: "14", time: "5:19.00" },
          { age: "15", time: "5:19.00" },
          { age: "16", time: "5:18.00" },
          { age: "17+", time: "5:02.50" },
        ]
      },
      "800m Freestyle": {
        male: [
          { age: "10", time: null },
          { age: "11", time: null },
          { age: "12", time: "13:30.00" },
          { age: "13", time: "12:30.00" },
          { age: "14", time: "11:45.00" },
          { age: "15", time: "10:45.00" },
          { age: "16", time: "10:30.00" },
          { age: "17+", time: "10:15.00" },
        ],
        female: [
          { age: "10", time: null },
          { age: "11", time: null },
          { age: "12", time: "12:12.00" },
          { age: "13", time: "12:08.00" },
          { age: "14", time: "11:20.00" },
          { age: "15", time: "11:18.00" },
          { age: "16", time: "10:27.00" },
          { age: "17+", time: "10:27.00" },
        ]
      },
      "1500m Freestyle": {
        male: [
          { age: "10", time: null },
          { age: "11", time: null },
          { age: "12", time: "25:00.00" },
          { age: "13", time: "24:30.00" },
          { age: "14", time: "23:00.00" },
          { age: "15", time: "20:30.00" },
          { age: "16", time: "19:35.00" },
          { age: "17+", time: "19:20.00" },
        ],
        female: [
          { age: "10", time: null },
          { age: "11", time: null },
          { age: "12", time: "24:30.00" },
          { age: "13", time: "24:15.00" },
          { age: "14", time: "22:00.00" },
          { age: "15", time: "21:50.00" },
          { age: "16", time: "20:00.00" },
          { age: "17+", time: "20:20.00" },
        ]
      },
      "50m Breaststroke": {
        male: [
          { age: "10", time: "57.00" },
          { age: "11", time: "57.00" },
          { age: "12", time: "55.00" },
          { age: "13", time: "52.00" },
          { age: "14", time: "46.00" },
          { age: "15", time: "44.00" },
          { age: "16", time: "41.00" },
          { age: "17+", time: "36.50" },
        ],
        female: [
          { age: "10", time: "57.00" },
          { age: "11", time: "57.00" },
          { age: "12", time: "55.00" },
          { age: "13", time: "47.00" },
          { age: "14", time: "45.00" },
          { age: "15", time: "45.00" },
          { age: "16", time: "46.50" },
          { age: "17+", time: "39.20" },
        ]
      },
      "50m Butterfly": {
        male: [
          { age: "10", time: "58.00" },
          { age: "11", time: "58.00" },
          { age: "12", time: "54.00" },
          { age: "13", time: "45.00" },
          { age: "14", time: "38.00" },
          { age: "15", time: "37.50" },
          { age: "16", time: "33.00" },
          { age: "17+", time: "29.00" },
        ],
        female: [
          { age: "10", time: "52.00" },
          { age: "11", time: "52.00" },
          { age: "12", time: "49.00" },
          { age: "13", time: "41.00" },
          { age: "14", time: "39.00" },
          { age: "15", time: "37.00" },
          { age: "16", time: "36.50" },
          { age: "17+", time: "32.50" },
        ]
      },
      "50m Backstroke": {
        male: [
          { age: "10", time: "49.00" },
          { age: "11", time: "49.00" },
          { age: "12", time: "46.00" },
          { age: "13", time: "44.50" },
          { age: "14", time: "39.00" },
          { age: "15", time: "38.50" },
          { age: "16", time: "37.00" },
          { age: "17+", time: "32.50" },
        ],
        female: [
          { age: "10", time: "50.00" },
          { age: "11", time: "50.00" },
          { age: "12", time: "46.00" },
          { age: "13", time: "42.00" },
          { age: "14", time: "40.00" },
          { age: "15", time: "38.00" },
          { age: "16", time: "37.00" },
          { age: "17+", time: "35.00" },
        ]
      },
    }

    const structured = parseSwimmingPdfLayout2( data.text )

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
