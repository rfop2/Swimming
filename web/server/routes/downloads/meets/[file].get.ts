import { createReadStream, promises as fsp } from "node:fs"
import { basename, extname, join } from "node:path"

// Serves meet packs uploaded at runtime, which aren't part of the built public assets
const contentTypeFor = ( ext: string ) => {
  if ( ext === ".pdf" ) return "application/pdf"
  if ( ext === ".doc" ) return "application/msword"
  if ( ext === ".docx" ) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if ( ext === ".png" ) return "image/png"
  if ( ext === ".jpg" || ext === ".jpeg" ) return "image/jpeg"
  if ( ext === ".webp" ) return "image/webp"
  return "application/octet-stream"
}

export default defineEventHandler( async ( event ) => {
  const raw = getRouterParam( event, "file", { decode: true } ) || ""
  const file = basename( raw )
  if ( !file || file !== raw ) throw createError( { statusCode: 400, statusMessage: "Invalid file" } )

  const filePath = join( meetPackDir(), file )

  let stat
  try {
    stat = await fsp.stat( filePath )
  } catch {
    throw createError( { statusCode: 404, statusMessage: "Not found" } )
  }
  if ( !stat.isFile() ) throw createError( { statusCode: 404, statusMessage: "Not found" } )

  setHeader( event, "Content-Type", contentTypeFor( extname( file ).toLowerCase() ) )
  setHeader( event, "Content-Length", stat.size )
  return sendStream( event, createReadStream( filePath ) )
} )
