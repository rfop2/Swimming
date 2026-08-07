import { basename } from "node:path"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { setup, url } from "@nuxt/test-utils/e2e"
import { layout7PdfPath, requireLayout7PdfPath } from "../swimming-import/layout7Fixture"

describe.skipIf( !layout7PdfPath )( "POST /api/import with layout 7", async () => {
  await setup( {
    rootDir: fileURLToPath( new URL( "../..", import.meta.url ) ),
    dev: true,
    captureServerLogs: false,
    setupTimeout: 240_000,
    serverStartTimeout: 180_000,
  } )

  it( "accepts the real PDF as multipart data and returns structured rows", async () => {
    const pdfPath = requireLayout7PdfPath()
    const formData = new FormData()
    formData.append( "layout", "layout7" )
    formData.append(
      "pdf_file",
      new Blob( [ readFileSync( pdfPath ) ], { type: "application/pdf" } ),
      basename( pdfPath )
    )

    const endpoint = url( "/api/import" )
    const response = await fetch( endpoint, {
      method: "POST",
      headers: { Origin: new URL( endpoint ).origin },
      body: formData,
    } )
    const body = await response.json() as { structured: Array<Record<string, unknown>> }

    expect( response.status ).toBe( 200 )
    expect( body.structured ).toHaveLength( 272 )
    expect( body.structured ).toContainEqual( {
      gender: "female",
      event: "Freestyle 50m",
      distance: "50m",
      stroke: "Freestyle",
      age: "10",
      time: "37.5",
    } )
  }, 120_000 )
} )
