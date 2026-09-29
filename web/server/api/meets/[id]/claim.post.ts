import { getPool, prepareStatement } from "lib"

// Links an unclaimed meet to the admin's club. Meets already linked to a club can't be claimed.
export default defineEventHandler( async ( event ) => {
  const meetId = getRouterParam( event, "id" )
  if ( !meetId ) {
    throw createError( {
      message: "No meet id supplied",
      status: 400,
    } )
  }

  const { clubId } = await readBody<{ clubId?: string }>( event )
  if ( !clubId ) {
    throw createError( {
      message: "No club id supplied",
      status: 400,
    } )
  }
  await requireClubOwner( event, clubId )

  const pool = await getPool()
  const selectMeet = prepareStatement<{ meetId: string }, { id: string }>(
    pool,
    "SELECT id FROM Meets WHERE id = :meetId"
  )
  if ( !await selectMeet.get( { meetId } ) ) {
    throw createError( { message: "Meet not found", status: 404 } )
  }

  // ClubMeets.meetId is unique, so IGNORE leaves an existing claim untouched
  const insertClubMeet = prepareStatement<{ clubId: string, meetId: string }>(
    pool,
    "INSERT IGNORE INTO ClubMeets (clubId, meetId) VALUES (:clubId, :meetId)"
  )
  const { affectedRows } = await insertClubMeet.run( { clubId, meetId } )
  if ( !affectedRows ) {
    throw createError( { message: "This meet has already been claimed by a club", status: 409 } )
  }

  // Claiming back a previously released meet lets the CLI club matcher consider it again
  const deleteRelease = prepareStatement<{ clubId: string, meetId: string }>(
    pool,
    "DELETE FROM ClubMeetReleases WHERE clubId = :clubId AND meetId = :meetId"
  )
  await deleteRelease.run( { clubId, meetId } )
} )
