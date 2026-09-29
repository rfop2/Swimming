import { getPool, prepareStatement, type Meet } from "lib"

type UnclaimedMeet = Pick<Meet, "id" | "date" | "name" | "location">

// Upcoming meets that no club has claimed yet, for a club admin to claim
export default defineEventHandler( async ( event ) => {
  const clubId = getRouterParam( event, "id" )
  if ( !clubId ) {
    throw createError( {
      message: "No club id supplied",
      status: 400,
    } )
  }
  await requireClubOwner( event, clubId )

  const search = String( getQuery( event ).search ?? "" ).trim()
  if ( !search ) return []

  const selectRecords = prepareStatement<{ searchPattern: string }, UnclaimedMeet>(
    await getPool(),
    `SELECT
      Meets.id,
      Meets.date,
      Meets.name,
      Meets.location
    FROM
      Meets
      LEFT JOIN ClubMeets ON (ClubMeets.meetId = Meets.id)
    WHERE
      ClubMeets.meetId IS NULL
      AND DATE_ADD(Meets.date, INTERVAL GREATEST(Meets.duration, 1) - 1 DAY) >= CURDATE()
      AND (Meets.name LIKE :searchPattern OR Meets.location LIKE :searchPattern OR Meets.contact LIKE :searchPattern)
    ORDER BY
      Meets.date, Meets.name
    LIMIT 20
    ;`
  )
  return await selectRecords.all( { searchPattern: `%${search}%` } )
} )
