import { getPool, prepareStatement, type Swimmer } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const swimmerId = getRouterParam( event, "id" )
  if ( !swimmerId ) {
    throw createError( {
      message: "No swimmer id supplied",
      status: 400
    } )
  }

  const selectSwimmer = prepareStatement<{ userId: string, swimmerId: string }, Swimmer>(
    await getPool(),
    `SELECT
        id,
        fullName,
        firstName,
        lastName,
        birthday,
        gender,
        nationality,
        region,
        county,
        active
      FROM
        Swimmers
        INNER JOIN UserSwimmers ON (Swimmers.id = UserSwimmers.swimmerId)
      WHERE
        Swimmers.id = :swimmerId AND
        UserSwimmers.userId = :userId`
  )
  const swimmer = await selectSwimmer.get( { userId: event.context.user.id, swimmerId } )
  if ( !swimmer ) {
    throw createError( {
      message: `Swimmer ${swimmerId} not found`,
      status: 404
    } )
  }

  return getSwimmerQualifications( swimmer )
} )
