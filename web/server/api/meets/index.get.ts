import { formatISO } from "date-fns"
import { type ClubMeet, getPool, prepareStatement, type SwimmingPool } from "lib"

interface FullMeet extends ClubMeet, Partial<SwimmingPool> {
  meetPack?: string
  meetInfo?: string
  poolId?: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const selectRecords = prepareStatement<{ userId: string }, FullMeet>(
    await getPool(),
    `SELECT
      Meets.*,
      -- A club admin's course (if set) replaces the listed one, hence after Meets.*
      COALESCE(MeetsMeta.course, Meets.course) AS course,
      Locations.latitude,
      Locations.longitude,
      MeetsMeta.meetPack,
      MeetsMeta.meetInfo,
      MeetsMeta.poolId,
      ClubMeets.clubId,
      Clubs.clubName,
      Pools.poolName,
      Pools.poolStreet1,
      Pools.poolStreet2,
      Pools.poolStreet3,
      Pools.poolTown,
      Pools.poolPostCode,
      Pools.poolWhatThreeWords,
      IF (UserMeets.userId IS NOT NULL, 1, 0) AS tagged
    FROM
      Meets
      LEFT JOIN Locations ON (Meets.locationId = Locations.locationId)
      LEFT JOIN MeetsMeta ON (Meets.id = MeetsMeta.meetId)
      LEFT JOIN ClubMeets ON (ClubMeets.meetId = Meets.id)
      LEFT JOIN Clubs ON (Clubs.clubId = ClubMeets.clubId)
      LEFT JOIN Pools ON (MeetsMeta.poolId = Pools.poolId)
      LEFT JOIN UserMeets ON (UserMeets.meetId = Meets.id AND UserMeets.userId = :userId)
    ;`
  )
  const meets = await selectRecords.all( { userId: event.context.user.id } )

  const selectLastUpdated = prepareStatement<unknown[], { lastUpdated: string }>(
    await getPool(),
    `SELECT
      GREATEST(
        MAX(created), MAX(updated)
      ) AS lastUpdated
    FROM
      Meets
    ;`
  )

  const result = await selectLastUpdated.get()
  if ( result && result.lastUpdated ) {
    setHeader( event, "x-last-updated", formatISO( result.lastUpdated ) )
  }

  return meets
} )
