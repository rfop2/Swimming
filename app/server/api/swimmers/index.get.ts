import { eq, and } from "drizzle-orm"
import { defineEventHandler } from "h3"
import { db, schema, type Swimmer } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const swimmers = await db
  .select( {
    userId: schema.UserSwimmers.userId,
    id: schema.Swimmers.id,
    name: schema.Swimmers.name,
    birthday: schema.Swimmers.birthday,
    gender: schema.Swimmers.gender,
    nationality: schema.Swimmers.nationality,
    region: schema.Swimmers.region,
    county: schema.Swimmers.county,
    active: schema.Swimmers.active,
  } )
  .from( schema.UserSwimmers )
  .innerJoin( schema.Swimmers, eq( schema.UserSwimmers.swimmerId, schema.Swimmers.id ) )
  .where(
    and(
      eq( schema.UserSwimmers.userId, userId ),
      eq( schema.Swimmers.active, 1 ) // fully type-safe
    )
  )
  return swimmers
} )
