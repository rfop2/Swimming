import type { H3Event } from "h3"
import { join } from "node:path"
import { getPool, prepareStatement, STROKE_DISTANCE } from "lib"

// Throws unless the current user is a site admin or an owner (admin) of the given club
export const requireClubOwner = async ( event: H3Event, clubId: string ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { status: 401 } )
  }
  if ( event.context.user.role === "admin" ) return

  const selectOwner = prepareStatement<{ userId: string, clubId: string }, { clubId: string }>(
    await getPool(),
    "SELECT clubId FROM UserClubs WHERE userId = :userId AND clubId = :clubId AND clubOwner = 1"
  )
  const owner = await selectOwner.get( { userId: event.context.user.id, clubId } )
  if ( !owner ) {
    throw createError( { status: 403 } )
  }
}

// Throws unless the current user may administer the club hosting the given meet, returns that club's id
export const requireMeetOwner = async ( event: H3Event, meetId: string ): Promise<string> => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { status: 401 } )
  }

  const selectClub = prepareStatement<{ meetId: string }, { clubId: string }>(
    await getPool(),
    "SELECT clubId FROM ClubMeets WHERE meetId = :meetId"
  )
  const clubMeet = await selectClub.get( { meetId } )
  if ( !clubMeet ) {
    throw createError( { message: "Meet not found", status: 404 } )
  }
  await requireClubOwner( event, clubMeet.clubId )
  return clubMeet.clubId
}

// MeetsMeta.events is a JSON array of STROKE_DISTANCE keys. MariaDB returns JSON columns as
// strings, so accept either form and drop anything that isn't a known stroke/distance.
export const parseMeetEvents = ( raw: unknown ): string[] => {
  let events = raw
  if ( typeof events === "string" ) {
    try {
      events = JSON.parse( events )
    } catch {
      return []
    }
  }
  if ( !Array.isArray( events ) ) return []
  return events.filter( ( e ): e is string => typeof e === "string" && e in STROKE_DISTANCE )
}

// Meet packs live alongside any existing static ones, served as /downloads/meets/<file>
export const meetPackDir = () => join( process.cwd(), "public", "downloads", "meets" )
