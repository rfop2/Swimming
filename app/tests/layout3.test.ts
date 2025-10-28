import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import pdf from "pdf-parse/lib/pdf-parse.js"
import { parseSwimmingPdfLayout3 } from "../server/utils/parseSwimmingDocs"

describe( "PDF Swimming Parser", () => {
  it( "should parse Qualifying document", async () => {
    const pdfPath = path.resolve( __dirname, "./data/2025-Dorset-County-ASA-Championships-Entry-Information-Iss-4-071124.pdf" )
    const buffer = fs.readFileSync( pdfPath )
    const data = await pdf( buffer )

    const expectedResults = {
      "50m FREESTYLE": {
        male: [
          { age: "10", time: "43.38" },
          { age: "11", time: "43.38" },
          { age: "12", time: "37.32" },
          { age: "13", time: "35.52" },
          { age: "14", time: "31.67" },
          { age: "15", time: "30.80" },
          { age: "16", time: "30.31" },
          { age: "17+", time: "29.24" },
        ],
        female: [
          { age: "10", time: "44.13" },
          { age: "11", time: "44.13" },
          { age: "12", time: "38.40" },
          { age: "13", time: "37.20" },
          { age: "14", time: "33.65" },
          { age: "15", time: "33.37" },
          { age: "16", time: "33.14" },
          { age: "17+", time: "32.60" },
        ]
      },
    }

    const structured = parseSwimmingPdfLayout3( data.text )
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
