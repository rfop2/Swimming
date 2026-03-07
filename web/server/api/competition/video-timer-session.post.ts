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
  startOffsetMs?: number | null
  resultSwimmer?: string | null
  resultCourse?: string | null
  resultStroke?: string | null
  resultDistance?: string | null
  resultSeq?: string | number | null
  markers: { type: MarkerType; code: string; label: string; tMs: number }[]
  analysis?: {
    skills?: {
      start?: {
        reactionSec?: number | null
        breakoutM?: number | null
      }
      turns?: Array<{
        rotationSec?: number | null
        breakoutM?: number | null
      }>
    }
    freeSwim?: {
      segment10to50?: {
        count?: number | null
      }
      segment60to100?: {
        count?: number | null
      }
    }
  }
}

const asNonEmptyString = ( v: unknown ) => ( typeof v === "string" && v.trim() ? v.trim() : null )

const asInt = ( v: unknown ) => {
  const n = typeof v === "number" ? v : Number( v )
  if ( !Number.isFinite( n ) ) return null
  return Math.round( n )
}

const asUnsignedInt = ( v: unknown ) => {
  const n = asInt( v )
  if ( n === null || n < 0 ) return null
  return n
}

const asUnsignedIntOrNull = ( v: unknown ) => {
  if ( v === null || v === undefined || v === "" ) return null
  return asUnsignedInt( v )
}

const asDecimalOrNull = ( v: unknown ) => {
  if ( v === null || v === undefined || v === "" ) return null
  const n = typeof v === "number" ? v : Number( v )
  if ( !Number.isFinite( n ) ) return null
  return Number( n.toFixed( 2 ) )
}

const asSecondsToMsOrNull = ( v: unknown ) => {
  if ( v === null || v === undefined || v === "" ) return null
  const n = typeof v === "number" ? v : Number( v )
  if ( !Number.isFinite( n ) || n < 0 ) return null
  return Math.round( n * 1000 )
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )

  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

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
  const size =
    typeof body?.video?.size === "number" && Number.isFinite( body.video.size )
      ? Math.max( 0, Math.round( body.video.size ) )
      : null

  const durationMs = asUnsignedIntOrNull( body?.video?.durationMs )

  const course = asNonEmptyString( body?.selections?.course )
  const stroke = asNonEmptyString( body?.selections?.stroke )
  const distance = asNonEmptyString( body?.selections?.distance )

  const swimmerId = body?.swimmerId ? asNonEmptyString( body.swimmerId ) : null
  const meetId = body?.meetId ? asNonEmptyString( body.meetId ) : null
  const notes = typeof body?.notes === "string" ? body.notes : null
  const startOffsetMs = asUnsignedIntOrNull( body?.startOffsetMs )

  const resultSwimmer = body?.resultSwimmer ? asNonEmptyString( body.resultSwimmer ) : null
  const resultCourse = body?.resultCourse ? asNonEmptyString( body.resultCourse ) : null
  const resultStroke = body?.resultStroke ? asNonEmptyString( body.resultStroke ) : null
  const resultDistance = body?.resultDistance ? asNonEmptyString( body.resultDistance ) : null
  const resultSeq = asUnsignedIntOrNull( body?.resultSeq )

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
      code: asNonEmptyString( m?.code ),
      label: asNonEmptyString( m?.label ),
      tMs: asUnsignedIntOrNull( m?.tMs ),
    } ) )
    .filter( ( m ) => m.type && m.code && m.label && m.tMs !== null ) as {
    type: MarkerType
    code: string
    label: string
    tMs: number
  }[]

  const count10to50 = asUnsignedIntOrNull( body?.analysis?.freeSwim?.segment10to50?.count )
  const count60to100 = asUnsignedIntOrNull( body?.analysis?.freeSwim?.segment60to100?.count )
  const reactionMs = asSecondsToMsOrNull( body?.analysis?.skills?.start?.reactionSec )
  const breakoutStartM = asDecimalOrNull( body?.analysis?.skills?.start?.breakoutM )
  const firstTurn = Array.isArray( body?.analysis?.skills?.turns ) ? body.analysis.skills.turns[0] : null
  const turnRotationMs = asSecondsToMsOrNull( firstTurn?.rotationSec )
  const breakoutTurnM = asDecimalOrNull( firstTurn?.breakoutM )

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
      durationMs,
    } )

    const sessionId = randomUUID()

    const insertSession = prepareStatement(
      conn,
      `
      INSERT INTO VideoTimerSessions (
        id,
        userId,
        swimmerId,
        videoId,
        meetId,
        course,
        stroke,
        distance,
        startOffsetMs,
        notes,
        resultSwimmer,
        resultCourse,
        resultStroke,
        resultDistance,
        resultSeq
      )
      VALUES (
        :id,
        :userId,
        :swimmerId,
        :videoId,
        :meetId,
        :course,
        :stroke,
        :distance,
        :startOffsetMs,
        :notes,
        :resultSwimmer,
        :resultCourse,
        :resultStroke,
        :resultDistance,
        :resultSeq
      )
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
      startOffsetMs,
      notes,
      resultSwimmer,
      resultCourse,
      resultStroke,
      resultDistance,
      resultSeq,
    } )

    if ( markers.length ) {
      const insertMarker = prepareStatement(
        conn,
        `
        INSERT INTO VideoTimerMarkers (sessionId, seq, type, code, label, tMs)
        VALUES (:sessionId, :seq, :type, :code, :label, :tMs)
        `
      )

      for ( let i = 0; i < markers.length; i++ ) {
        const m = markers[i]!
        await insertMarker.run( {
          sessionId,
          seq: i + 1,
          type: m.type,
          code: m.code,
          label: m.label,
          tMs: m.tMs,
        } )
      }
    }

    const insertAnalysis = prepareStatement(
      conn,
      `
      INSERT INTO VideoTimerSessionAnalysis (
        sessionId,
        count10to50,
        count60to100,
        reactionMs,
        breakoutStartM,
        turnRotationMs,
        breakoutTurnM
      )
      VALUES (
        :sessionId,
        :count10to50,
        :count60to100,
        :reactionMs,
        :breakoutStartM,
        :turnRotationMs,
        :breakoutTurnM
      )
      `
    )

    await insertAnalysis.run( {
      sessionId,
      count10to50,
      count60to100,
      reactionMs,
      breakoutStartM,
      turnRotationMs,
      breakoutTurnM,
    } )

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