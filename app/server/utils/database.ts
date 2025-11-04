import { hash } from "@node-rs/argon2"
import type { UserClub, ExtSwimmer } from "lib"
import { prepareStatement, addSwimmerTask, isMySql2Error } from "lib"
import type { User } from "lucia"
import { generateId } from "lucia"
import type { Pool, PoolConnection } from "mysql2/promise"

export interface UserData {
  username: string
  firstName: string
  lastName: string
  location: string
  password: string
  confirmPassword: string
  clubs: Array<UserClub>
  swimmers: Array<ExtSwimmer>
}

const deleteUserSwimmersSql = "DELETE FROM UserSwimmers WHERE userId = :userId"

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
  ) VALUES (
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
  ) ON DUPLICATE KEY UPDATE
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

const insertUserSwimmerSql =
  `INSERT IGNORE INTO UserSwimmers (
    userId,
    swimmerId
  ) VALUES (
    :userId,
    :id
  )`

export const updateUserSwimmers = async ( conn: Pool | PoolConnection, userId: User["id"], swimmers: UserData["swimmers"] ) => {
  // Now do swimmers
  if ( swimmers.length === 0 ) {
    const deleteSwimmersQuery = prepareStatement(
      conn,
      deleteUserSwimmersSql
    )
    await deleteSwimmersQuery.run( { userId } )
  } else {
    const swimmerIds = swimmers.map( swimmer => swimmer.id )
    const swimmerIdsSql = swimmerIds.map( ( _, i ) => `:swimmerIds${i}` ).join( ", " )
    const swimmerIdsValues = Object.fromEntries( swimmerIds.map( ( id, i ) => ( [ `swimmerIds${i}`, id ] ) ) )
    const purgeSwimmersQuery = prepareStatement(
      conn,
      `DELETE FROM UserSwimmers WHERE userId = :userId AND swimmerId NOT IN (${swimmerIdsSql})`
    )
    await purgeSwimmersQuery.run( { ...swimmerIdsValues, ...{ userId } } )

    const insertSwimmer = prepareStatement( conn, insertSwimmerSql )
    const insertUserSwimmer = prepareStatement( conn, insertUserSwimmerSql )
    const insertClubSwimmer = prepareStatement( conn, insertClubSwimmerSql )
    const deleteClubSwimmer = prepareStatement( conn, deleteClubSwimmerSql )
    for ( const swimmer of swimmers ) {
      await insertSwimmer.run( swimmer )
      const { affectedRows } = await insertUserSwimmer.run( { userId, id: swimmer.id } )
      if ( swimmer.clubId ) {
        await insertClubSwimmer.run( { clubId: swimmer.clubId, swimmerId: swimmer.id, squad: swimmer.squad } )
      } else {
        await deleteClubSwimmer.run( { swimmerId: swimmer.id } )
      }
      if ( affectedRows === 1 ) {
        addSwimmerTask( conn, userId, swimmer )
      }
    }
  }
}

const insertClubSwimmerSql =
  `INSERT IGNORE INTO ClubSwimmers (
    clubId,
    swimmerId,
    rankedClub,
    squad
  ) VALUES (
    :clubId,
    :swimmerId,
    1
    :squad
  ) ON DUPLICATE KEY UPDATE
    rankedClub = VALUES(rankedClub),
    squad = VALUES(squad)
  ;`

const deleteClubSwimmerSql = "DELETE FROM ClubSwimmers WHERE swimmerId = :swimmerId"

export const updateUserClubs = async ( conn: Pool | PoolConnection, userId: User["id"], clubs: UserData["clubs"] ) => {
  if ( clubs.length === 0 ) {
    const deleteClubs = prepareStatement(
      conn,
      "DELETE FROM UserClubs WHERE userId = :userId"
    )
    await deleteClubs.run( { userId } )
  } else {
    const clubIds = clubs.map( club => club.clubId )
    const clubIdsSql = clubIds.map( ( _, i ) => `:clubIds${i}` ).join( ", " )
    const clubIdsValues = Object.fromEntries( clubIds.map( ( id, i ) => ( [ `clubIds${i}`, id ] ) ) )
    const deleteClubs = prepareStatement(
      conn,
      `DELETE FROM UserClubs WHERE userId = :userId AND clubId NOT IN (${clubIdsSql})`
    )
    await deleteClubs.run( { ...clubIdsValues, ...{ userId } } )

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
    for ( const club of clubs ) {
      await insertUserClub.run( { ...club, userId } )
    }
  }
}

const insertUserSql = "INSERT INTO User ( id, username, password_hash, firstName, lastName, type, location ) VALUES( :userId, :username, :passwordHash, :firstName, :lastName, :type, :location )"

export const addUser = async ( conn: Pool | PoolConnection, userData: UserData ) => {
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
    const addUserQuery = prepareStatement(
      conn,
      insertUserSql
    )
    await addUserQuery.run( { ...userData, userId, passwordHash } )
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
          status: 500
        } )
      }
    }
    throw createError( {
      message: "An unknown error occurred",
      status: 500
    } )
  }
  console.log( "User created" )

  await updateUserSwimmers( conn, userId, userData.swimmers )
  await updateUserClubs( conn, userId, userData.clubs )
}

const updateUserPasswordSql = "UPDATE User SET password_hash = :passwordHash WHERE id = :userId"
const updateUserSql = "UPDATE User SET username = :username, firstName = :firstName, lastName = :lastName, location = :location, type = :type WHERE id = :userId"

export const updateUser = async ( conn: Pool | PoolConnection, userId: string, userData: UserData ) => {
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
              updateUserPasswordSql
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

  const updateUserQuery = prepareStatement(
    conn,
    updateUserSql
  )
  await updateUserQuery.run( { ...userData, ...{ userId } } )
  console.log( "User updated" )

  await updateUserSwimmers( conn, userId, userData.swimmers )
  await updateUserClubs( conn, userId, userData.clubs )
}
