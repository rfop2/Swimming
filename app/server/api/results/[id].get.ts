import { getPool, prepareStatement, type ResultsRow } from "lib"

type Params = {
  course: string
  stroke: string
  distance: string
  startDate: string | null
  endDate: string | null
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

  const selectFilteredRecords = prepareStatement<Params & { id: string }, ResultsRow>(
    await getPool(),
    "SELECT * FROM Results WHERE swimmer = :id AND course = :course AND stroke = :stroke AND distance = :distance AND date > COALESCE( :startDate, '1970-01-01' ) AND date <= COALESCE( :endDate, CURDATE() ) ORDER BY date ASC"
  )

  const selectAllRecords = prepareStatement<{ id: string }, ResultsRow>(
    await getPool(),
    "SELECT * FROM Results WHERE swimmer = :id ORDER BY date ASC"
  )

  const query = getQuery<Params>( event )
  if ( Object.values( query ).length ) {
    if ( !query.startDate ) query.startDate = null
    if ( !query.endDate ) query.endDate = null
    return await selectFilteredRecords.all( { id, ...query } )
  } else {
    return await selectAllRecords.all( { id } )
  }
} )
