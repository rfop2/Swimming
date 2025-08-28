import type { Swimmer } from "lib"
import { db } from "~/server/utils/db"

interface UserData {
  username: string
  firstName: string
  lastName: string
  location: string
  password: string
  confirmPassword: string
  swimmers: Array<Swimmer>
}

export default eventHandler( async ( event ) => {
  if ( !event.context.session ) {
    throw createError( {
      statusCode: 403
    } )
  }

  const updateUser = db.transaction( ( userId: string, userData: UserData ) => {

    if ( userData.password && userData.confirmPassword ) {
      if ( userData.password === userData.confirmPassword ) {
        if ( userData.password.length >= 8 && userData.password.length <= 32 ) {
          // Ignore it if it's just *s
          if ( !userData.password.match( /^\*+$/ ) ) {
            if ( userData.password.match( /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/ ) ) {
              const sql = "UPDATE User SET password = :password WHERE id = :userId"
              const updatePassword = db.prepare( sql )
              updatePassword.run( { ...userData, ...{ userId } } )
            } else {
              throw createError( {
                message: "Password must contain mixed case letters, numbers and symbols",
                statusCode: 400
              } )
            }
          }
        } else {
          throw createError( {
            message: "Password must be 8-32 characters long",
            statusCode: 400
          } )
        }
      } else {
        throw createError( {
          message: "Passwords do not match",
          statusCode: 400
        } )
      }
    }

    const sql = "UPDATE User SET username = :username, firstName = :firstName, lastName = :lastName, location = :location WHERE id = :userId"
    const updateUser = db.prepare( sql )
    updateUser.run( { ...userData, ...{ userId } } )

    // Now do swimmers
    const swimmerIds = userData.swimmers.map( swimmer => swimmer.id )
    const swimmerIdsSql = swimmerIds.map( ( _, i ) => `:swimmerIds${i}` ).join( ", " )
    const swimmerIdsValues = Object.fromEntries( swimmerIds.map( ( id, i ) => ( [ `swimmerIds${i}`, id ] ) ) )
    const deleteSwimmers = db.prepare( `DELETE FROM UserSwimmers WHERE userId = :userId AND swimmerId NOT IN (${swimmerIdsSql})` )
    deleteSwimmers.run( { ...swimmerIdsValues, ...{ userId } } )

    const insertSwimmerSql =
      `INSERT INTO Swimmers (
        id,
        name,
        birthday,
        gender,
        nationality,
        region,
        county,
        active
      )
      VALUES (
        :id,
        :name,
        :birthday,
        :gender,
        :nationality,
        :region,
        :county,
        :active
      )
      ON CONFLICT(id) DO UPDATE SET
        name        = excluded.name,
        birthday    = excluded.birthday,
        gender      = excluded.gender,
        nationality = excluded.nationality,
        region      = excluded.region,
        county      = excluded.county,
        active      = excluded.active
      ;`

    const insertSwimmer = db.prepare( insertSwimmerSql )
    for ( const swimmer of userData.swimmers ) {
      console.log( swimmer )
      insertSwimmer.run( swimmer )
    }

    const insertUserSwimmerSql =
      `INSERT OR IGNORE INTO UserSwimmers (
        userId,
        swimmerId
      )
      VALUES (
        :userId,
        :id
      );`
    const insertUserSwimmer = db.prepare( insertUserSwimmerSql )
    for ( const swimmer of userData.swimmers ) {
      insertUserSwimmer.run( { userId, id: swimmer.id } )
    }
  } )

  try {
    const id = getRouterParam( event, "id" )
    if ( !id ) {
      throw createError( {
        message: "No user id found",
        statusCode: 400
      } )
    }
    const userData = await readBody( event )

    updateUser( id, userData )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update user record",
      statusCode: 500
    } )
  }
} )
