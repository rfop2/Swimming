import type { PoolConnection, VideoTimerSessionShareRecord } from "lib"
import { createError, defineEventHandler } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type Row = {
  id: string
  sessionId: string
  ownerId: string
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  sharedWithUserId: string
  sharedWithFirstName: string
  sharedWithLastName: string
  sharedWithEmail: string
  createdAt: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )
  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const stmt = prepareStatement<{ userId: string }, Row>(
      conn,
      `
      SELECT
        sh.id as id,
        sh.sessionId as sessionId,
        sh.ownerId as ownerId,
        owner.firstName as ownerFirstName,
        owner.lastName as ownerLastName,
        owner.username as ownerEmail,
        sh.sharedWithUserId as sharedWithUserId,
        recipient.firstName as sharedWithFirstName,
        recipient.lastName as sharedWithLastName,
        recipient.username as sharedWithEmail,
        sh.createdAt as createdAt
      FROM VideoTimerSessionShares sh
      INNER JOIN User owner ON owner.id = sh.ownerId
      INNER JOIN User recipient ON recipient.id = sh.sharedWithUserId
      WHERE sh.ownerId = :userId
      ORDER BY sh.createdAt DESC
      `
    )

    const rows = await stmt.all( { userId } )

    const shares: VideoTimerSessionShareRecord[] = rows.map( r => ( {
      id: r.id,
      sessionId: r.sessionId,
      ownerId: r.ownerId,
      ownerName: `${r.ownerFirstName} ${r.ownerLastName}`.trim(),
      ownerEmail: r.ownerEmail,
      sharedWithUserId: r.sharedWithUserId,
      sharedWithName: `${r.sharedWithFirstName} ${r.sharedWithLastName}`.trim(),
      sharedWithEmail: r.sharedWithEmail,
      createdAt: r.createdAt,
    } ) )

    return shares
  } catch ( error ) {
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw createError( { status: 500, message: "Unable to load video timer session shares" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )
