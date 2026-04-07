import { getPool, prepareStatement, type ExtSwimmer } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const userId = getRouterParam( event, "id" ) ?? event.context.session.userId
  if ( !userId ) {
    throw createError( {
      message: "No user id found",
      status: 400
    } )
  }

  const isAdmin = event.context.user.role === "admin"
  if ( userId !== event.context.user.id && !isAdmin ) {
    throw createError( {
      status: 403
    } )
  }

  const selectRecords = prepareStatement<{ userId: string }, ExtSwimmer>(
    await getPool(),
    `SELECT
      id,
      fullName,
      firstName,
      middleName,
      lastName,
      birthday,
      gender,
      nationality,
      region,
      county,
      GROUP_CONCAT(ClubSwimmers.clubId SEPARATOR '|') AS clubIds,
      GROUP_CONCAT(ClubSwimmers.rankedClub SEPARATOR '|') AS rankedClubs,
      GROUP_CONCAT(ClubSwimmers.squad SEPARATOR '|') AS squads,
      GROUP_CONCAT(CONCAT_WS("/", ClubSwimmers.clubId, ClubSwimmers.rankedClub, ClubSwimmers.squad) SEPARATOR "|") AS swimmerClubs,
      active,
      lastUpdateTime,
      lastUpdateType
    FROM
      Swimmers
      INNER JOIN UserSwimmers ON (Swimmers.id = UserSwimmers.swimmerId)
      LEFT JOIN UserClubs ON (UserClubs.userId = UserSwimmers.userId)
      LEFT JOIN ClubSwimmers ON (ClubSwimmers.clubId = UserClubs.clubId AND Swimmers.id = ClubSwimmers.swimmerId)
    WHERE
      UserSwimmers.userId = :userId
    GROUP BY
      UserSwimmers.userId,
      UserSwimmers.swimmerId,
      ClubSwimmers.swimmerId`
  )
  const data = await selectRecords.all( { userId: userId ?? event.context.session.userId } )
  return data
} )
