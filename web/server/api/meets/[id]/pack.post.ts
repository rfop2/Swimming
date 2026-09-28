import { mkdir, unlink, writeFile } from "node:fs/promises"
import { basename, extname, join } from "node:path"
import { getPool, prepareStatement, type MeetMeta } from "lib"

const MAX_BYTES = 20 * 1024 * 1024
const ALLOWED_EXTENSIONS = [ ".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp" ]

export default defineEventHandler( async ( event ) => {
  const meetId = getRouterParam( event, "id" )
  if ( !meetId ) {
    throw createError( {
      message: "No meet id supplied",
      status: 400,
    } )
  }
  const clubId = await requireMeetOwner( event, meetId )

  const length = Number( getHeader( event, "content-length" ) ?? 0 )
  if ( length > MAX_BYTES ) {
    throw createError( { message: "File too large (maximum 20MB)", status: 413 } )
  }

  const parts = await readMultipartFormData( event )
  const file = parts?.find( p => p.name === "pack" && p.filename )
  if ( !file || !file.filename ) {
    throw createError( { message: "No file supplied", status: 400 } )
  }
  if ( file.data.length > MAX_BYTES ) {
    throw createError( { message: "File too large (maximum 20MB)", status: 413 } )
  }

  const ext = extname( file.filename ).toLowerCase()
  if ( !ALLOWED_EXTENSIONS.includes( ext ) ) {
    throw createError( { message: `File type not allowed, use one of ${ALLOWED_EXTENSIONS.join( ", " )}`, status: 415 } )
  }

  const stem = basename( file.filename, extname( file.filename ) )
    .toLowerCase()
    .replace( /[^a-z0-9]+/g, "-" )
    .replace( /^-+|-+$/g, "" )
    .slice( 0, 80 ) || "meet-pack"
  const meetPack = `${meetId}-${stem}${ext}`

  const dir = meetPackDir()
  await mkdir( dir, { recursive: true } )
  await writeFile( join( dir, meetPack ), file.data )

  const pool = await getPool()
  const selectMeta = prepareStatement<{ meetId: string }, Pick<MeetMeta, "meetPack">>(
    pool,
    "SELECT meetPack FROM MeetsMeta WHERE meetId = :meetId"
  )
  const existingPack = ( await selectMeta.get( { meetId } ) )?.meetPack ?? null

  try {
    const upsertPack = prepareStatement<{ meetId: string, meetPack: string, clubId: string }>(
      pool,
      `INSERT INTO MeetsMeta (meetId, meetPack, clubId)
        VALUES (:meetId, :meetPack, :clubId)
        ON DUPLICATE KEY UPDATE
          meetPack = VALUES(meetPack),
          clubId = VALUES(clubId)`
    )
    await upsertPack.run( { meetId, meetPack, clubId } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to save meet pack",
      status: 500
    } )
  }

  if ( existingPack && existingPack !== meetPack ) {
    await unlink( join( dir, basename( existingPack ) ) ).catch( () => undefined )
  }

  return { meetPack }
} )
