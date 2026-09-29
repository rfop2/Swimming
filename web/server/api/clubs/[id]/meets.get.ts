import { getPool, prepareStatement, type Meet, type MeetMeta } from "lib"

export interface ClubAdminMeet extends Omit<Meet, "link" | "latitude" | "longitude" | "tagged">, Omit<MeetMeta, "meetId" | "clubId" | "course" | "events"> {
  poolName: string | null
  poolTown: string | null
  poolPostCode: string | null
  events: string[]
}

export default defineEventHandler( async ( event ) => {
  const clubId = getRouterParam( event, "id" )
  if ( !clubId ) {
    throw createError( {
      message: "No club id supplied",
      status: 400,
    } )
  }
  await requireClubOwner( event, clubId )

  // Upcoming includes meets that are still in progress
  // The admin's course (if set) replaces the listed one, hence after Meets.*
  const selectRecords = prepareStatement<{ clubId: string }, Omit<ClubAdminMeet, "events"> & { events: unknown }>(
    await getPool(),
    `SELECT
      Meets.*,
      COALESCE(MeetsMeta.course, Meets.course) AS course,
      MeetsMeta.meetPack,
      MeetsMeta.meetInfo,
      MeetsMeta.poolId,
      MeetsMeta.events,
      Pools.poolName,
      Pools.poolTown,
      Pools.poolPostCode
    FROM
      Meets
      INNER JOIN ClubMeets ON (ClubMeets.meetId = Meets.id)
      LEFT JOIN MeetsMeta ON (Meets.id = MeetsMeta.meetId)
      LEFT JOIN Pools ON (MeetsMeta.poolId = Pools.poolId)
    WHERE
      ClubMeets.clubId = :clubId
      AND DATE_ADD(Meets.date, INTERVAL GREATEST(Meets.duration, 1) - 1 DAY) >= CURDATE()
    ORDER BY
      Meets.date, Meets.name
    ;`
  )
  const meets = await selectRecords.all( { clubId } )
  return meets.map( ( meet ): ClubAdminMeet => ( { ...meet, events: parseMeetEvents( meet.events ) } ) )
} )
