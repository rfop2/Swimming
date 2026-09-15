import { verify } from "@node-rs/argon2"
import { type DatabaseUser, getPool, prepareStatement } from "lib"
import * as yup from "yup"
import { checkRateLimit } from "~~/server/utils/rateLimiter"

const loginSchema = yup.object( {
  username: yup.string().required().min( 3 ).max( 63 ).email(),
  password: yup.string().required().min( 6 ).max( 255 ),
} )

export default defineEventHandler( async ( event ) => {
  const ip = getRequestIP( event, { xForwardedFor: true } ) ?? "unknown"
  const { allowed, retryAfter } = checkRateLimit( `login:${ip}`, 10, 15 * 60 * 1000 )
  if ( !allowed ) {
    setHeader( event, "Retry-After", retryAfter ?? 0 )
    throw createError( { statusCode: 429, message: "Too many login attempts. Please try again later." } )
  }

  const formData = await readFormData( event )
  const raw = { username: formData.get( "username" ), password: formData.get( "password" ) }

  let username: string, password: string
  try {
    ( { username, password } = await loginSchema.validate( raw, { abortEarly: true } ) )
  } catch ( err ) {
    throw createError( { statusCode: 400, message: ( err as yup.ValidationError ).message } )
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

  if ( !existingUser.password_hash ) {
    // Account is pending setup (created by an admin, awaiting the user to set their own password).
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
    const ip = getRequestIP( event, { xForwardedFor: true } )
    const insertLog = prepareStatement( await getPool(), "INSERT INTO Logs SET logCategory = 'user', logType = 'login', logText = :logText" )
    insertLog.run( { logText: `${username} logged in, IP ${ip}, session ${session.id}` } )
    const insertTracking = prepareStatement( await getPool(), "INSERT INTO SessionTracking SET sessionId = :sessionId, sessionAction = 'login', userId = :userId, sessionIP = :sessionIP" )
    insertTracking.run( { sessionId: session.id, userId: existingUser.id, sessionIP: ip } )
  } catch ( err ) {
    console.error( "Session insert failed:", err )
  }
} )
