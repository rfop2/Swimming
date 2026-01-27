import type { PoolConnection } from "lib"
import { createError, defineEventHandler, readBody } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"
import { randomUUID } from "node:crypto"


type MarkerType = "surfacing" | "split"

type Body = {
  video: {
    id: string
    playbackUrl: string
    originalName: string
    mimeType: string
    size: number
    durationMs?: number
  }
  selections: { course: string; stroke: string; distance: string }
  swimmerId?: string | null
  meetId?: string | null
  notes?: string
  markers: { type: MarkerType; tMs: number }[]
}

const asNonEmptyString = ( v: unknown ) => ( typeof v === "string" && v.trim() ? v.trim() : null )
const asIntMs = ( v: unknown ) => {
  const n = typeof v === "number" ? v : Number( v )
  if ( !Number.isFinite( n ) ) return null
  const i = Math.round( n )
  if ( i < 0 ) return null
  return i
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { status: 401 } )
  }

  const userId = event.context.user.id
  if ( !userId ) {
    throw createError( { status: 401 } )
  }

  let body: Body
  try {
    body = await readBody<Body>( event )
  } catch {
    throw createError( { status: 400, message: "Invalid JSON body" } )
  }

  const videoId = asNonEmptyString( body?.video?.id )
  const playbackUrl = asNonEmptyString( body?.video?.playbackUrl )
  const originalName = asNonEmptyString( body?.video?.originalName )
  const mimeType = asNonEmptyString( body?.video?.mimeType )
  const size = typeof body?.video?.size === "number" && Number.isFinite( body.video.size ) ? Math.max( 0, Math.round( body.video.size ) ) : null

  const course = asNonEmptyString( body?.selections?.course )
  const stroke = asNonEmptyString( body?.selections?.stroke )
  const distance = asNonEmptyString( body?.selections?.distance )

  const swimmerId = body?.swimmerId ? asNonEmptyString( body.swimmerId ) : null
  const meetId = body?.meetId ? asNonEmptyString( body.meetId ) : null
  const notes = typeof body?.notes === "string" ? body.notes : null

  if ( !videoId || !playbackUrl || !originalName || !mimeType || size === null ) {
    throw createError( { status: 400, message: "Missing video fields" } )
  }
  if ( !course || !stroke || !distance ) {
    throw createError( { status: 400, message: "Missing selections" } )
  }

  const markersIn = Array.isArray( body?.markers ) ? body.markers : []
  const markers = markersIn
    .map( ( m ) => ( {
      type: m?.type === "surfacing" || m?.type === "split" ? m.type : null,
      tMs: asIntMs( m?.tMs ),
    } ) )
    .filter( ( m ) => m.type && m.tMs !== null ) as { type: MarkerType; tMs: number }[]

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const upsertVideo = prepareStatement(
      conn,
      `
      INSERT INTO VideoTimerVideos (id, userId, playbackUrl, originalName, mimeType, size, durationMs)
      VALUES (:id, :userId, :playbackUrl, :originalName, :mimeType, :size, :durationMs)
      ON DUPLICATE KEY UPDATE
        playbackUrl = VALUES(playbackUrl),
        originalName = VALUES(originalName),
        mimeType = VALUES(mimeType),
        size = VALUES(size),
        durationMs = VALUES(durationMs),
        updated = current_timestamp()
      `
    )

    await upsertVideo.run( {
      id: videoId,
      userId,
      playbackUrl,
      originalName,
      mimeType,
      size,
      durationMs: body.video.durationMs ?? null,
    } )

    const sessionId = randomUUID()

    const insertSession = prepareStatement(
      conn,
      `
      INSERT INTO VideoTimerSessions (id, userId, swimmerId, videoId, meetId, course, stroke, distance, notes)
      VALUES (:id, :userId, :swimmerId, :videoId, :meetId, :course, :stroke, :distance, :notes)
      `
    )

    await insertSession.run( {
      id: sessionId,
      userId,
      swimmerId: swimmerId ?? null,
      videoId,
      meetId: meetId ?? null,
      course,
      stroke,
      distance,
      notes,
    } )

    if ( markers.length ) {
      const insertMarker = prepareStatement(
        conn,
        `
        INSERT INTO VideoTimerMarkers (sessionId, seq, type, tMs)
        VALUES (:sessionId, :seq, :type, :tMs)
        `
      )

      for ( let i = 0; i < markers.length; i++ ) {
        const m = markers[i]!
        await insertMarker.run( {
          sessionId,
          seq: i + 1,
          type: m.type,
          tMs: m.tMs,
        } )
      }
    }

    await conn.commit()

    return { id: sessionId }

  } catch ( error ) {
    try {
      await conn.rollback()
    } catch ( err ) {
      void err
    }

    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw createError( { status: 500, message: "Unable to save video timer session" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )
