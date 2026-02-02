import Busboy from "busboy"
import { createError, defineEventHandler } from "h3"
import { promises as fsp, createWriteStream  } from "node:fs"

import { join, extname } from "node:path"
import { randomUUID } from "node:crypto"

export default defineEventHandler( async ( event ) => {
  const req = event.node.req
  const contentType = String( req.headers["content-type"] || "" )

  if ( !contentType.includes( "multipart/form-data" ) ) {
    throw createError( { statusCode: 415, statusMessage: "Expected multipart/form-data" } )
  }

  const maxBytes = 300 * 1024 * 1024
  const dir = join( process.cwd(), "public", "uploads" )
  await fsp.mkdir( dir, { recursive: true } )

  const id = randomUUID()

  const result = await new Promise<{ id: string; playbackUrl: string }>( ( resolve, reject ) => {
    const bb = Busboy( { headers: req.headers, limits: { files: 1, fileSize: maxBytes } } )

    let storedName = ""
    let writePath = ""
    let writeDone: Promise<void> | null = null
    let gotFile = false
    let ended = false

    const fail = ( statusCode: number, statusMessage: string ) => {
      if ( ended ) return
      ended = true
      if ( writePath ) fsp.unlink( writePath ).catch( () => {} )
      reject( createError( { statusCode, statusMessage } ) )
    }

    bb.on( "file", ( field, file, info: { filename: string; mimeType: string } ) => {
      if ( field !== "video" ) {
        file.resume()
        return
      }

      gotFile = true

      const filename = info.filename || ""
      const mimeType = info.mimeType || ""

      if ( !mimeType.startsWith( "video/" ) ) {
        file.resume()
        fail( 415, "Invalid file type" )
        return
      }

      const safeExt = extname( filename ) || ".mp4"
      storedName = `${id}${safeExt}`
      writePath = join( dir, storedName )

      const ws = createWriteStream( writePath )

      writeDone = new Promise<void>( ( res, rej ) => {
        ws.on( "finish", res )
        ws.on( "close", res )
        ws.on( "error", rej )
      } )

      file.on( "limit", () => fail( 413, "File too large" ) )
      file.on( "error", () => fail( 500, "Upload stream error" ) )
      ws.on( "error", () => fail( 500, "Write error" ) )

      file.pipe( ws )
    } )

    bb.on( "error", () => fail( 400, "Malformed multipart data" ) )

    bb.on( "finish", () => {
      if ( ended ) return
      if ( !gotFile ) {
        fail( 400, "Missing video field" )
        return
      }

      const done = writeDone ?? Promise.resolve()
      done
        .then( () => {
          if ( ended ) return
          ended = true
          resolve( { id, playbackUrl: `/uploads/${storedName}` } )
        } )
        .catch( () => fail( 500, "Write error" ) )
    } )

    req.pipe( bb )
  } )

  return result
} )
