import { unlink } from "node:fs/promises"
import { basename, join } from "node:path"
import { getPool, prepareStatement, runTransaction, type MeetMeta } from "lib"

// Releases a meet from the admin's club, clearing its details. The release is remembered
// so the CLI club matcher won't link the meet to this club again (claiming it clears that).
export default defineEventHandler( async ( event ) => {
  const meetId = getRouterParam( event, "id" )
  if ( !meetId ) {
    throw createError( {
      message: "No meet id supplied",
      status: 400,
    } )
  }
  const clubId = await requireMeetOwner( event, meetId )

  const pool = await getPool()
  const selectMeta = prepareStatement<{ meetId: string }, Pick<MeetMeta, "meetPack">>(
    pool,
    "SELECT meetPack FROM MeetsMeta WHERE meetId = :meetId"
  )
  const meetPack = ( await selectMeta.get( { meetId } ) )?.meetPack ?? null

  try {
    await runTransaction( pool, async ( conn ) => {
      await prepareStatement<{ clubId: string, meetId: string }>(
        conn,
        "DELETE FROM ClubMeets WHERE clubId = :clubId AND meetId = :meetId"
      ).run( { clubId, meetId } )
      await prepareStatement<{ clubId: string, meetId: string }>(
        conn,
        "INSERT IGNORE INTO ClubMeetReleases (clubId, meetId) VALUES (:clubId, :meetId)"
      ).run( { clubId, meetId } )
      await prepareStatement<{ meetId: string }>(
        conn,
        "DELETE FROM MeetsMeta WHERE meetId = :meetId"
      ).run( { meetId } )
    } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to release meet",
      status: 500
    } )
  }

  if ( meetPack ) {
    await unlink( join( meetPackDir(), basename( meetPack ) ) ).catch( () => undefined )
  }
} )
