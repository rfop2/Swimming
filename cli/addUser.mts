#!/usr/bin/env nodemjs
import { hash } from "@node-rs/argon2"
import { generateId } from "lucia"
import { webcrypto } from "node:crypto"
import Database, { SqliteError } from "better-sqlite3"

import { DB_PATH } from "lib"

globalThis.crypto = webcrypto as Crypto

const db = new Database( DB_PATH )
db.pragma( "journal_mode = WAL" );

( async () => {
  const args = process.argv.slice( 2 )

  if ( args.length < 2 ) {
    throw( "Error, username and password must be given" )
  }

  const username = args[0]
  const password = args[1]

  if (
    username.length < 3 ||
    username.length > 31 ||
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
    db.prepare( "INSERT INTO user (id, username, password_hash) VALUES(?, ?, ?)" ).run(
      userId,
      username,
      passwordHash
    )
  } catch ( e ) {
    if ( e instanceof SqliteError && e.code === "SQLITE_CONSTRAINT_UNIQUE" ) {
      throw new Error( "Username already used" )
    }
    throw new Error( "An unknown error occurred" )
  }
  console.log( "User created" )
  process.exit( 0 )

} )().catch( ( error ) => {
  console.error( "Caught error...", error )
  console.trace( error )
} )
