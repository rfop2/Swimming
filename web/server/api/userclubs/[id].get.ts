import { getPool, prepareStatement, type UserClub } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const userId = getRouterParam( event, "id" )
  if ( userId && event.context.user.role !== "admin" ) {
    throw createError( {
      status: 403
    } )
  }

  const selectRecords = prepareStatement<{ userId: string }, UserClub>(
    await getPool(),
    "SELECT Clubs.clubId, Clubs.clubName, Clubs.clubAlias, Clubs.clubRegion, Clubs.clubCounty, UserClubs.clubOwner FROM Clubs INNER JOIN UserClubs ON (Clubs.clubId = UserClubs.clubId) WHERE UserClubs.userId = :userId"
  )
  const data = await selectRecords.all( { userId: userId ?? event.context.session.userId } )
  return data
} )
