import { verify } from "@node-rs/argon2"
import { type DatabaseUser, getPool, prepareStatement } from "lib"

export default eventHandler( async ( event ) => {
  const formData = await readFormData( event )
  const username = formData.get( "username" )
  if (
    typeof username !== "string"
    || username.length < 3
    || username.length > 63
    || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test( username )
  ) {
    throw createError( {
      message: "Invalid username",
      status: 400
    } )
  }
  const password = formData.get( "password" )
  if ( typeof password !== "string" || password.length < 6 || password.length > 255 ) {
    throw createError( {
      message: "Invalid password",
      status: 400
    } )
  }

  const getExistingUser = prepareStatement( await getPool(), "SELECT * FROM User WHERE username = :username" )
  const existingUser = await getExistingUser.get( { username } ) as
    DatabaseUser |
    undefined
  if ( !existingUser ) {
    throw createError( {
      message: "Incorrect username or password",
      status: 400
    } )
  }

  const validPassword = await verify( existingUser.password_hash, password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1
  } )
  if ( !validPassword ) {
    // NOTE:
    // Returning immediately allows malicious actors to figure out valid usernames from response times,
    // allowing them to only focus on guessing passwords in brute-force attacks.
    // As a preventive measure, you may want to hash passwords even for invalid usernames.
    // However, valid usernames can be already be revealed with the signup page among other methods.
    // It will also be much more resource intensive.
    // Since protecting against this is non-trivial,
    // it is crucial your implementation is protected against brute-force attacks with login throttling, 2FA, etc.
    // If usernames are public, you can outright tell the user that the username is invalid.
    throw createError( {
      message: "Incorrect username or password",
      status: 400
    } )
  }

  try {
    const session = await lucia.createSession( existingUser.id, {} )
    appendHeader( event, "Set-Cookie", lucia.createSessionCookie( session.id ).serialize() )
  } catch ( err ) {
    console.error( "Session insert failed:", err )
  }
} )
