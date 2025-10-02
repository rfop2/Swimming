import { hash } from "@node-rs/argon2"
import { getPool, prepareStatement, runTransaction, type Swimmer } from "lib"
import type { PoolConnection } from "mysql2/promise"

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
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 403
    } )
  }

  const updateUser = async ( conn: PoolConnection, userId: string, userData: UserData ) => {
    if ( userData.password && userData.confirmPassword ) {
      if ( userData.password === userData.confirmPassword ) {
        if ( userData.password.length >= 8 && userData.password.length <= 32 ) {
          // Ignore it if it's just *s
          if ( !userData.password.match( /^\*+$/ ) ) {
            if ( userData.password.match( /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/ ) ) {
              const passwordHash = await hash( userData.password, {
                // recommended minimum parameters
                memoryCost: 19456,
                timeCost: 2,
                outputLen: 32,
                parallelism: 1
              } )

              const updatePassword = prepareStatement(
                conn,
                "UPDATE User SET password_hash = :passwordHash WHERE id = :userId"
              )
              await updatePassword.run( { passwordHash, ...{ userId } } )
            } else {
              throw createError( {
                message: "Password must contain mixed case letters, numbers and symbols",
                status: 400
              } )
            }
          }
        } else {
          throw createError( {
            message: "Password must be 8-32 characters long",
            status: 400
          } )
        }
      } else {
        throw createError( {
          message: "Passwords do not match",
          status: 400
        } )
      }
    }

    const updateUser = prepareStatement(
      conn,
      "UPDATE User SET username = :username, firstName = :firstName, lastName = :lastName, location = :location WHERE id = :userId"
    )
    await updateUser.run( { ...userData, ...{ userId } } )

    // Now do swimmers
    const swimmerIds = userData.swimmers.map( swimmer => swimmer.id )
    const swimmerIdsSql = swimmerIds.map( ( _, i ) => `:swimmerIds${i}` ).join( ", " )
    const swimmerIdsValues = Object.fromEntries( swimmerIds.map( ( id, i ) => ( [ `swimmerIds${i}`, id ] ) ) )
    const deleteSwimmers = prepareStatement(
      conn,
      `DELETE FROM UserSwimmers WHERE userId = :userId AND swimmerId NOT IN (${swimmerIdsSql})`
    )
    await deleteSwimmers.run( { ...swimmerIdsValues, ...{ userId } } )

    const insertSwimmerSql =
      `INSERT INTO Swimmers (
        id,
        firstName,
        middleName,
        lastName,
        birthday,
        gender,
        nationality,
        region,
        county,
        active
      )
      VALUES (
        :id,
        :firstName,
        :middleName,
        :lastName,
        :birthday,
        :gender,
        :nationality,
        :region,
        :county,
        :active
      )
      ON DUPLICATE KEY UPDATE
        firstName   = :firstName,
        middleName  = :middleName,
        lastName    = :lastName,
        birthday    = :birthday,
        gender      = :gender,
        nationality = :nationality,
        region      = :region,
        county      = :county,
        active      = :active
      ;`

    const insertSwimmer = prepareStatement( conn, insertSwimmerSql )
    for ( const swimmer of userData.swimmers ) {
      await insertSwimmer.run( swimmer )
    }

    const insertUserSwimmerSql =
      `INSERT INTO UserSwimmers (
        userId,
        swimmerId,
        squad
      )
      VALUES (
        :userId,
        :id,
        :squad
      )
      ON DUPLICATE KEY UPDATE
        squad   = :squad
      ;`
    const insertUserSwimmer = prepareStatement( conn, insertUserSwimmerSql )
    for ( const swimmer of userData.swimmers ) {
      await insertUserSwimmer.run( { userId, id: swimmer.id, squad: swimmer.squad } )
    }
  }

  try {
    const userId = getRouterParam( event, "id" )
    if ( !userId ) {
      throw createError( {
        message: "No user id found",
        status: 400
      } )
    }

    if ( userId !== event.context.user.id && !Number( event.context.user.admin ) ) {
      throw createError( {
        status: 403
      } )
    }

    const userData = await readBody( event )

    await runTransaction( await getPool(), updateUser, userId, userData )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update user record",
      status: 500
    } )
  }
} )
