import Busboy from "busboy"
import { createError, defineEventHandler } from "h3"
import { extname } from "node:path"
import { randomUUID } from "node:crypto"
import { S3Client } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"

const getRequiredEnv = ( name: string ) => {
  const value = process.env[name]?.trim()
  if ( !value ) {
    throw createError( { statusCode: 500, statusMessage: `Missing env: ${name}` } )
  }
  return value
}

const getS3Client = () =>
  new S3Client( {
    region: getRequiredEnv( "AWS_REGION" ),
    credentials: {
      accessKeyId: getRequiredEnv( "AWS_ACCESS_KEY_ID" ),
      secretAccessKey: getRequiredEnv( "AWS_SECRET_ACCESS_KEY" ),
    },
  } )

export default defineEventHandler( async ( event ) => {
  const req = event.node.req
  const contentType = String( req.headers["content-type"] || "" )

  if ( !contentType.includes( "multipart/form-data" ) ) {
    throw createError( { statusCode: 415, statusMessage: "Expected multipart/form-data" } )
  }

  const bucket = getRequiredEnv( "AWS_S3_BUCKET" )
  const cloudfrontUrl = getRequiredEnv( "AWS_CLOUDFRONT_URL" ).replace( /\/+$/, "" )
  const s3 = getS3Client()
  const maxBytes = 700 * 1024 * 1024
  const id = randomUUID()

  const result = await new Promise<{ id: string; playbackUrl: string }>( ( resolve, reject ) => {
    const bb = Busboy( {
      headers: req.headers,
      limits: { files: 1, fileSize: maxBytes },
    } )

    let gotFile = false
    let ended = false
    let uploadPromise: Promise<unknown> | null = null
    let uploadKey = ""
    let activeUpload: Upload | null = null

    const fail = ( statusCode: number, statusMessage: string ) => {
      if ( ended ) return
      ended = true
      if ( activeUpload ) {
        void activeUpload.abort()
      }
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
      uploadKey = `video-timer/${id}${safeExt}`

      activeUpload = new Upload( {
        client: s3,
        params: {
          Bucket: bucket,
          Key: uploadKey,
          Body: file,
          ContentType: mimeType,
        },
        leavePartsOnError: false,
      } )

      uploadPromise = activeUpload.done()

      file.on( "limit", () => fail( 413, "File too large" ) )
      file.on( "error", () => fail( 500, "Upload stream error" ) )
    } )

    bb.on( "error", () => fail( 400, "Malformed multipart data" ) )

    bb.on( "finish", () => {
      if ( ended ) return

      if ( !gotFile ) {
        fail( 400, "Missing video field" )
        return
      }

      const done = uploadPromise ?? Promise.resolve()

      done
        .then( () => {
          if ( ended ) return
          ended = true
          resolve( {
            id,
            playbackUrl: `${cloudfrontUrl}/${uploadKey}`,
          } )
        } )
        .catch( () => fail( 500, "S3 upload error" ) )
    } )

    req.pipe( bb )
  } )

  return result
} )