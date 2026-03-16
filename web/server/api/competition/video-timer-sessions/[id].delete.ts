import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getRouterParam } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )

  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const sessionId = String( getRouterParam( event, "id" ) ?? "" ).trim()
  if ( !sessionId ) throw createError( { status: 400, message: "Missing id" } )

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const checkStmt = prepareStatement(
      conn,
      `
      SELECT id
      FROM VideoTimerSessions
      WHERE id = :id AND userId = :userId
      LIMIT 1
      `
    )

    const existing = await checkStmt.get( { id: sessionId, userId } )
    if ( !existing ) {
      throw createError( { status: 404, message: "Session not found" } )
    }

    const deleteSession = prepareStatement(
      conn,
      `
      DELETE FROM VideoTimerSessions
      WHERE id = :id AND userId = :userId
      `
    )

    await deleteSession.run( {
      id: sessionId,
      userId,
    } )

    await conn.commit()

    return {
      id: sessionId,
      deleted: true,
    }
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

    throw createError( { status: 500, message: "Unable to delete video timer session" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )