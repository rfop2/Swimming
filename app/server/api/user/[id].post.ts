import { hash } from "@node-rs/argon2"
import { getPool, isMySql2Error, prepareStatement, runTransaction, type UserClub, type ExtSwimmer } from "lib"
import { generateId } from "lucia"
import type { PoolConnection } from "mysql2/promise"

interface UserData {
  username: string
  firstName: string
  lastName: string
  location: string
  password: string
  confirmPassword: string
  clubs: Array<UserClub>
  swimmers: Array<ExtSwimmer>
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
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
        status: 400
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
        conn,
        "INSERT INTO User ( id, username, password_hash, firstName, lastName, type, location ) VALUES( :userId, :username, :passwordHash, :firstName, :lastName, :type, :location )"
      )
      await addUser.run( { ...userData, userId, passwordHash } )
    } catch ( e ) {
      console.error( e )
      if ( isMySql2Error( e ) ) {
        if ( e.code === "ER_DUP_ENTRY" ) {
          throw createError( {
            message: "Username already used",
            status: 400
          } )
        } else {
          throw createError( {
            message: `Database error: ${e.sqlMessage}`,
            status: 400
          } )
        }
      }
      throw createError( {
        message: "An unknown error occurred",
        status: 400
      } )
    }
    console.log( "User created" )

    const insertUserClubSql =
      `INSERT INTO UserClubs (
        userId,
        clubId,
        clubOwner
      )
      VALUES (
        :userId,
        :clubId,
        :clubOwner
      )
      ON DUPLICATE KEY UPDATE
        clubOwner = :clubOwner
      ;`
    const insertUserClub = prepareStatement( conn, insertUserClubSql )
    for ( const club of userData.clubs ) {
      await insertUserClub.run( { userId, clubId: club.clubId, clubOwner: club.clubOwner } )
    }

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

    const insertClubSwimmerSql =
      `INSERT IGNORE INTO ClubSwimmers (
          clubId,
          swimmerId
        )
        VALUES (
          :clubId,
          :swimmerId
        );`

    const insertSwimmer = prepareStatement( conn, insertSwimmerSql )
    const insertClubSwimmer = prepareStatement( conn, insertClubSwimmerSql )
    for ( const swimmer of userData.swimmers ) {
      await insertSwimmer.run( swimmer )
      if ( swimmer.clubId ) {
        await insertClubSwimmer.run( { clubId: swimmer.clubId, swimmerId: swimmer.id } )
      }
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

    await runTransaction( await getPool(), addUser, userData )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to create user record",
      status: 500
    } )
  }
} )
