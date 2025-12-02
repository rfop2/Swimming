import { getPool, prepareStatement, type Club } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const clubId = getRouterParam( event, "id" )
  if ( !clubId ) {
    throw createError( {
      message: "No club id found",
      status: 400
    } )
  }

  const selectRecords = prepareStatement<{ clubId: string }, Club>(
    await getPool(),
    `SELECT
      clubId,
      clubName,
      clubAlias,
      clubRegion,
      clubCounty,
      meetName,
      lastMemberUpdate
    FROM
      Clubs
    WHERE clubId = :clubId`
  )
  const data = await selectRecords.get( { clubId } )
  return data
} )
