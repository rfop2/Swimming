import { type Club, getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const query = getQuery( event )
  const search = query.search ?? ""

  const selectRecords = prepareStatement<{ searchPattern: string }, Club>(
    await getPool(),
    "SELECT * FROM Clubs WHERE ClubName LIKE :searchPattern ORDER BY ClubName ASC"
  )
  const data = await selectRecords.all( { searchPattern: `%${search}%` } )
  return data
} )
