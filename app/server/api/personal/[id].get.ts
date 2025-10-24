import { getPool, prepareStatement, type IndividualRow } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const pool = await getPool()

  const userId = event.context.user.id
  const swimmerId = getRouterParam( event, "id" )

  const selectRecords = prepareStatement<{ userId: string, swimmerId: string }, IndividualRow>(
    pool,
    "SELECT Individual.* FROM Individual INNER JOIN UserSwimmers ON Individual.swimmer = UserSwimmers.swimmerId AND UserSwimmers.userId = :userId WHERE swimmer = :swimmerId ORDER BY course DESC, stroke ASC, distance ASC",
  )

  if ( swimmerId ) {
    const data = await selectRecords.all( { userId, swimmerId } )
    return data
  } else {
    const selectUserSwimmerIds = prepareStatement<{ userId: string }, { swimmerId: string }>(
      pool,
      "SELECT swimmerId FROM UserSwimmers WHERE userId = :userId"
    )
    const swimmerIds = await selectUserSwimmerIds.all( { userId } )
    const totalData = []
    for ( const { swimmerId } of swimmerIds ) {
      const data = await selectRecords.all( { userId, swimmerId } )
      totalData.push( ...data )
    }
    return totalData
  }
} )
