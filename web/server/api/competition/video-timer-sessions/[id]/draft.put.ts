import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getRouterParam, readBody } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type Body = {
  draft?: unknown
  notes?: string
}

export default defineEventHandler( async event => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )
  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const id = String( getRouterParam( event, "id" ) ?? "" ).trim()
  if ( !id ) throw createError( { status: 400, message: "Missing id" } )

  const body = await readBody<Body>( event )
  if ( !body?.draft || typeof body.draft !== "object" || Array.isArray( body.draft ) ) {
    throw createError( { status: 400, message: "Invalid draft data" } )
  }

  const draftData = JSON.stringify( body.draft )
  if ( Buffer.byteLength( draftData, "utf8" ) > 2_000_000 ) {
    throw createError( { status: 413, message: "Draft data is too large" } )
  }

  const draft = body.draft as { startOffsetMs?: unknown }
  const numericStartOffset = typeof draft.startOffsetMs === "number" && Number.isFinite( draft.startOffsetMs )
    ? Math.round( draft.startOffsetMs )
    : null
  const notes = typeof body.notes === "string" ? body.notes : null

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const update = prepareStatement( conn, `
      UPDATE VideoTimerSessions
      SET draftData = :draftData,
          startOffsetMs = :startOffsetMs,
          notes = :notes,
          updated = current_timestamp()
      WHERE id = :id
        AND userId = :userId
        AND status = 'draft'
    ` )
    const result = await update.run( {
      id,
      userId,
      draftData,
      startOffsetMs: numericStartOffset,
      notes,
    } )

    if ( Number( result.affectedRows ) < 1 ) {
      throw createError( { status: 404, message: "Draft session not found" } )
    }

    return { id, savedAt: new Date().toISOString() }
  } catch ( error ) {
    if ( error && typeof error === "object" && "statusCode" in error ) throw error
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }
    throw createError( { status: 500, message: "Unable to save draft session" } )
  } finally {
    conn.release()
  }
} )
