import { getPool, prepareStatement, type Meet, type MeetMeta } from "lib"

export interface ClubAdminMeet extends Omit<Meet, "link" | "latitude" | "longitude" | "tagged">, Omit<MeetMeta, "meetId" | "clubId"> {
  poolName: string | null
  poolTown: string | null
  poolPostCode: string | null
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
  const selectRecords = prepareStatement<{ clubId: string }, ClubAdminMeet>(
    await getPool(),
    `SELECT
      Meets.*,
      MeetsMeta.meetPack,
      MeetsMeta.meetInfo,
      MeetsMeta.poolId,
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
  return await selectRecords.all( { clubId } )
} )
