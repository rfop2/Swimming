import { defineEventHandler } from "h3"
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

  const selectMaxCreated = prepareStatement<{ userId: string, swimmerId: string }, { MaxCreated: string }>(
    pool,
    "SELECT MAX(Individual.created) AS MaxCreated FROM Individual INNER JOIN UserSwimmers ON Individual.swimmer = UserSwimmers.swimmerId AND UserSwimmers.userId = :userId WHERE swimmer = :swimmerId",
  )
  const selectRecords = prepareStatement<{ userId: string, swimmerId: string, date: string }, IndividualRow>(
    pool,
    "SELECT Individual.* FROM Individual INNER JOIN UserSwimmers ON Individual.swimmer = UserSwimmers.swimmerId AND UserSwimmers.userId = :userId WHERE swimmer = :swimmerId AND Individual.created = :date ORDER BY course DESC, stroke ASC, distance ASC",
  )

  if ( swimmerId ) {
    const result = await selectMaxCreated.get( { userId, swimmerId } )
    if ( !result?.MaxCreated ) {
      throw createError( { status: 404, statusText: "No records found" } )
    }

    const data = await selectRecords.all( { userId, swimmerId, date: result.MaxCreated } )
    return data
  } else {
    const selectUserSwimmerIds = prepareStatement<{ userId: string }, { swimmerId: string }>(
      pool,
      "SELECT swimmerId FROM UserSwimmers WHERE userId = :userId"
    )
    const swimmerIds = await selectUserSwimmerIds.all( { userId } )
    const totalData = []
    for ( const { swimmerId } of swimmerIds ) {
      const result = await selectMaxCreated.get( { userId, swimmerId } )
      if ( result?.MaxCreated ) {
        const data = await selectRecords.all( { userId, swimmerId, date: result.MaxCreated } )
        totalData.push( ...data )
      }
    }
    return totalData
  }
} )
