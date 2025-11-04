import { type Meet, getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const selectRecords = prepareStatement<{ userId: string }, Meet>(
    await getPool(),
    `SELECT
      MeetsView.*,
      MeetsMeta.meetPack,
      MeetsMeta.meetInfo,
      MeetsMeta.poolId,
      Pools.poolName,
      Pools.poolStreet1,
      Pools.poolStreet2,
      Pools.poolStreet3,
      Pools.poolTown,
      Pools.poolPostCode,
      Pools.poolWhatThreeWords,
      IF (UserMeets.userId IS NOT NULL, 1, 0) AS tagged
    FROM
      MeetsView
        LEFT JOIN MeetsMeta ON (MeetsView.id = MeetsMeta.meetId)
        LEFT JOIN Pools ON (MeetsMeta.poolId = Pools.poolId)
        LEFT JOIN UserMeets ON UserMeets.meetId = MeetsView.id
        AND UserMeets.userId = :userId`
  )
  const data = await selectRecords.all( { userId: event.context.user.id } )
  return data
} )
