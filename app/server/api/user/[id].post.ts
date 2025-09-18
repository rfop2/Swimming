import { hash } from "@node-rs/argon2"
import { getPool, isMySql2Error, prepareStatement, runTransaction, type Swimmer } from "lib"
import { generateId } from "lucia"
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
      statusCode: 403
    } )
  }

  const addUser = async ( conn: PoolConnection, userData: UserData ) => {
    if (
      userData.username.length < 8
      || userData.username.length > 64
      || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test( userData.username )
    ) {
      throw createError( {
        message: "Username must be a valid email address between 8 and 64 characters long",
        statusCode: 400
      } )
    }

    if ( userData.password && userData.confirmPassword ) {
      if ( userData.password === userData.confirmPassword ) {
        if ( userData.password.length >= 8 && userData.password.length <= 32 ) {
          // Ignore it if it's just *s
          if ( !userData.password.match( /^\*+$/ ) ) {
            if ( !userData.password.match( /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/ ) ) {
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

    // Password is ok
    const passwordHash = await hash( userData.password, {
    // recommended minimum parameters
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1
    } )

    const userId = generateId( 15 )

    try {
      const addUser = prepareStatement(
        await getPool(),
        "INSERT INTO User ( id, username, password_hash, firstName, lastName, type, location ) VALUES( :userId, :username, :passwordHash, :firstName, :lastName, :type, :location )"
      )
      await addUser.run( { ...userData, userId, passwordHash } )
    } catch ( e ) {
      if ( isMySql2Error( e ) ) {
        if ( e.code === "ER_DUP_ENTRY" ) {
          throw createError( {
            message: "Username already used",
            statusCode: 400
          } )
        } else {
          throw createError( {
            message: `Database error: ${e.sqlMessage}`,
            statusCode: 400
          } )
        }
      }
      throw createError( {
        message: "An unknown error occurred",
        statusCode: 400
      } )
    }
    console.log( "User created" )

    // Now do swimmers
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
        statusCode: 400
      } )
    }

    if ( userId !== event.context.user.id && !Number( event.context.user.admin ) ) {
      throw createError( {
        statusCode: 403
      } )
    }

    const userData = await readBody( event )

    await runTransaction( await getPool(), addUser, userData )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to create user record",
      statusCode: 500
    } )
  }
} )
