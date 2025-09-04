#!/usr/bin/env nodemjs
import { hash } from "@node-rs/argon2"
import { getPool, isMySql2Error, prepareStatement } from "lib"
import { generateId } from "lucia"

( async () => {
  const args = process.argv.slice( 2 )

  if ( args.length < 6 ) {
    throw( "Error, username, password, first and last names, type and location must be given" )
  }

  const username = args[0]
  const password = args[1]
  const firstName = args[2]
  const lastName = args[3]
  const type = args[4]
  const location = args[5]

  if (
    username.length < 3 ||
    username.length > 63 ||
    !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test( username )
  ) {
    throw new Error ( "Invalid username" )
  }

  if ( password.length < 6 || password.length > 255 ) {
    throw new Error( "Invalid password" )
  }

  const passwordHash = await hash( password, {
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
    await addUser.run( {
      userId,
      username,
      passwordHash,
      firstName,
      lastName,
      type,
      location
    } )
  } catch ( e ) {
    if ( isMySql2Error( e ) ) {
      if ( e.code === "ER_DUP_ENTRY" ) {
        throw new Error( "Username already used" )
      } else {
        throw new Error( `Database error: ${e.sqlMessage}` )
      }
    }
    throw new Error( "An unknown error occurred" )
  }
  console.log( "User created" )
  process.exit( 0 )

} )().catch( ( error ) => {
  console.error( "Caught error...", error )
  console.trace( error )
  process.exit( -1 )
} )
