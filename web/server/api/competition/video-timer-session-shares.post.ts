import { randomUUID } from "node:crypto"
import type { PoolConnection } from "lib"
import type { User } from "lucia"
import { createError, defineEventHandler, getRequestURL, readBody } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"
import { sendEmail } from "~~/server/utils/email"

type SessionOwnerRow = {
  id: string
}

type SessionSummaryRow = {
  id: string
  course: string
  stroke: string
  distance: string
}

type UserRow = {
  id: string
  username: string
  firstName: string
  lastName: string
}

type ShareResult = {
  sessionId: string
  email: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )
  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const body = await readBody<{ sessionIds?: unknown, emails?: unknown }>( event )

  const sessionIds = Array.from(
    new Set(
      ( Array.isArray( body?.sessionIds ) ? body.sessionIds : [] )
        .map( id => String( id ?? "" ).trim() )
        .filter( Boolean )
    )
  )

  const callerEmail = String( event.context.user.username ?? "" ).trim().toLowerCase()

  const emails = Array.from(
    new Set(
      ( Array.isArray( body?.emails ) ? body.emails : [] )
        .map( email => String( email ?? "" ).trim().toLowerCase() )
        .filter( email => email && email !== callerEmail )
    )
  )

  if ( sessionIds.length === 0 ) throw createError( { status: 400, message: "No sessions selected" } )
  if ( emails.length === 0 ) throw createError( { status: 400, message: "No email addresses provided" } )

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const checkOwnership = prepareStatement<{ id: string, userId: string }, SessionOwnerRow>(
      conn,
      `
      SELECT id
      FROM VideoTimerSessions
      WHERE id = :id AND userId = :userId
      LIMIT 1
      `
    )

    for ( const sessionId of sessionIds ) {
      const owned = await checkOwnership.get( { id: sessionId, userId } )
      if ( !owned ) throw createError( { status: 404, message: "Session not found" } )
    }

    const getSessionSummary = prepareStatement<{ id: string }, SessionSummaryRow>(
      conn,
      `
      SELECT id, course, stroke, distance
      FROM VideoTimerSessions
      WHERE id = :id
      LIMIT 1
      `
    )

    const getUserByEmail = prepareStatement<{ email: string }, UserRow>(
      conn,
      `
      SELECT id, username, firstName, lastName
      FROM User
      WHERE username = :email
      LIMIT 1
      `
    )

    const insertShare = prepareStatement<{ id: string, sessionId: string, ownerId: string, sharedWithUserId: string }>(
      conn,
      `
      INSERT IGNORE INTO VideoTimerSessionShares (id, sessionId, ownerId, sharedWithUserId)
      VALUES (:id, :sessionId, :ownerId, :sharedWithUserId)
      `
    )

    const notFound: string[] = []
    const shared: ShareResult[] = []
    const alreadyShared: ShareResult[] = []
    const newlySharedUsers = new Map<string, UserRow>()
    const newlySharedSessionsByUser = new Map<string, SessionSummaryRow[]>()

    for ( const email of emails ) {
      const recipient = await getUserByEmail.get( { email } )
      if ( !recipient ) {
        notFound.push( email )
        continue
      }

      for ( const sessionId of sessionIds ) {
        const shareId = randomUUID()
        const result = await insertShare.run( {
          id: shareId,
          sessionId,
          ownerId: userId,
          sharedWithUserId: recipient.id,
        } )

        if ( result.affectedRows === 1 ) {
          shared.push( { sessionId, email: recipient.username } )
          newlySharedUsers.set( recipient.id, recipient )
          const summary = await getSessionSummary.get( { id: sessionId } )
          if ( summary ) {
            const list = newlySharedSessionsByUser.get( recipient.id ) ?? []
            list.push( summary )
            newlySharedSessionsByUser.set( recipient.id, list )
          }
        } else {
          alreadyShared.push( { sessionId, email: recipient.username } )
        }
      }
    }

    await conn.commit()

    const origin = getRequestURL( event ).origin
    const sharedWithMeUrl = `${origin}/competition/video-timer/sessions/shared`
    const ownerName = `${event.context.user.firstName} ${event.context.user.lastName}`.trim()

    for ( const [ recipientId, recipient ] of newlySharedUsers ) {
      const sessions = newlySharedSessionsByUser.get( recipientId ) ?? []
      if ( sessions.length === 0 ) continue

      const sessionList = sessions
        .map( s => `<li>${s.distance ?? "?"} ${s.stroke ?? "?"} (${String( s.course ?? "?" ).toUpperCase()})</li>` )
        .join( "" )

      const subject = sessions.length === 1
        ? `${ownerName} shared a video timer session with you`
        : `${ownerName} shared ${sessions.length} video timer sessions with you`

      const recipientUser = {
        id: recipient.id,
        username: recipient.username,
        firstName: recipient.firstName,
        lastName: recipient.lastName,
      } as unknown as User

      try {
        await sendEmail(
          recipientUser,
          subject,
          `<p>${ownerName} shared the following recorded video timer session(s) with you, read-only:</p><ul>${sessionList}</ul>`,
          { label: "View shared sessions", url: sharedWithMeUrl }
        )
      } catch ( err ) {
        void err
      }
    }

    return { shared, alreadyShared, notFound }
  } catch ( error ) {
    try {
      await conn.rollback()
    } catch ( err ) {
      void err
    }

    if ( error && typeof error === "object" && "statusCode" in error ) throw error

    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw createError( { status: 500, message: "Unable to share video timer session(s)" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )
