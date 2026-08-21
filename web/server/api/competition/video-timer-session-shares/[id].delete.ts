import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getRouterParam } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type ShareRow = {
  id: string
  ownerId: string
  sharedWithUserId: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )
  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const shareId = String( getRouterParam( event, "id" ) ?? "" ).trim()
  if ( !shareId ) throw createError( { status: 400, message: "Missing id" } )

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const checkStmt = prepareStatement<{ id: string }, ShareRow>(
      conn,
      `
      SELECT id, ownerId, sharedWithUserId
      FROM VideoTimerSessionShares
      WHERE id = :id
      LIMIT 1
      `
    )

    const existing = await checkStmt.get( { id: shareId } )
    if ( !existing || ( existing.ownerId !== userId && existing.sharedWithUserId !== userId ) ) {
      throw createError( { status: 404, message: "Share not found" } )
    }

    const deleteStmt = prepareStatement<{ id: string }>(
      conn,
      `
      DELETE FROM VideoTimerSessionShares
      WHERE id = :id
      `
    )

    await deleteStmt.run( { id: shareId } )

    await conn.commit()

    return { id: shareId, deleted: true }
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

    throw createError( { status: 500, message: "Unable to remove share" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )
