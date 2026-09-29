import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getRouterParam, readBody } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type UpdateVideoNotesBody = {
  notes?: unknown
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )

  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const id = String( getRouterParam( event, "id" ) || "" ).trim()
  if ( !id ) throw createError( { status: 400, message: "Missing video id" } )

  const body = await readBody<UpdateVideoNotesBody>( event )
  if ( typeof body?.notes !== "string" ) {
    throw createError( { status: 400, message: "Notes must be text" } )
  }

  const trimmedNotes = body.notes.trim()
  if ( trimmedNotes.length > 2000 ) {
    throw createError( { status: 400, message: "Notes cannot exceed 2000 characters" } )
  }

  const notes = trimmedNotes || null
  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const selectVideo = prepareStatement(
      conn,
      "SELECT id FROM VideoTimerVideos WHERE id = :id AND userId = :userId LIMIT 1"
    )

    if ( !( await selectVideo.get( { id, userId } ) ) ) {
      throw createError( { status: 404, message: "Video not found" } )
    }

    const updateNotes = prepareStatement(
      conn,
      `
      UPDATE VideoTimerVideos
      SET notes = :notes
      WHERE id = :id
        AND userId = :userId
      `
    )

    await updateNotes.run( { id, userId, notes } )

    return { id, notes }
  } catch ( error ) {
    if ( ( error as { statusCode?: number } )?.statusCode ) throw error

    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw createError( { status: 500, message: "Unable to update video notes" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )
