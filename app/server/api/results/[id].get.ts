import { defineEventHandler } from "h3"
import { getPool, prepareStatement, type ResultsRow } from "lib"

type Params = {
  course?: string
  stroke?: string
  distance?: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      status: 401
    } )
  }

  const id = getRouterParam( event, "id" )
  if ( !id ) {
    throw createError( {
      message: "No swimmer id supplied",
      status: 400,
    } )
  }
  const selectRecords = prepareStatement<Params, ResultsRow>(
    await getPool(),
    "SELECT * FROM Results WHERE swimmer = :id AND course = :course AND stroke = :stroke AND distance = :distance ORDER BY date ASC"
  )

  const query = getQuery( event )
  query.id = id
  const data = await selectRecords.all( query )
  return data
} )
