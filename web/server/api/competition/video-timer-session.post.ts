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
  selections: {
    course: string
    stroke: string
    distance: string
  }
  swimmerId?: string | null
  meetId?: string | null
  notes?: string
  officialFinishMs?: number | null
  startOffsetMs?: number | null
  resultSwimmer?: string | null
  resultCourse?: string | null
  resultStroke?: string | null
  resultDistance?: string | null
  resultSeq?: string | number | null
  markers: Array<{
    type: MarkerType
    code: string
    label: string
    lengthIndex?: number | null
    turnIndex?: number | null
    tMs: number
  }>
  analysis?: {
    breakoutStartM?: number | null
    start?: {
      breakoutM?: number | null
    }
    strokeCounts?: Array<{
      lengthIndex: number
      fromM: number
      toM: number
      count?: number | null
    }>
    turns?: Array<{
      turnIndex: number
      breakoutM?: number | null
    }>
  }
  strokeCounts?: Array<{
    lengthIndex: number
    fromM: number
    toM: number
    count?: number | null
  }>
  turns?: Array<{
    turnIndex: number
    breakoutM?: number | null
  }>
  computed?: unknown
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

const asPositiveIntOrNull = ( v: unknown ) => {
  const n = asUnsignedIntOrNull( v )
  if ( n === null || n <= 0 ) return null
  return n
}

const asDecimalOrNull = ( v: unknown, digits = 2 ) => {
  if ( v === null || v === undefined || v === "" ) return null
  const n = typeof v === "number" ? v : Number( v )
  if ( !Number.isFinite( n ) ) return null
  return Number( n.toFixed( digits ) )
}

const parseDistanceM = ( value: string | null ) => {
  if ( !value ) return null
  const n = Number( String( value ).replace( /[^\d]/g, "" ) )
  if ( !Number.isFinite( n ) || n <= 0 ) return null
  return Math.round( n )
}

const normaliseCourse = ( value: string | null ) => String( value || "" ).trim().toLowerCase()

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
  const officialFinishMs = asUnsignedIntOrNull( body?.officialFinishMs )
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

  const distanceM = parseDistanceM( distance )
  if ( distanceM === null ) {
    throw createError( { status: 400, message: "Invalid distance" } )
  }

  const normalisedCourse = normaliseCourse( course )
  const poolLengthM =
    normalisedCourse === "sc"
      ? 25
      : normalisedCourse === "lc"
        ? 50
        : null

  if ( poolLengthM === null ) {
    throw createError( { status: 400, message: "Invalid course" } )
  }

  if ( distanceM % poolLengthM !== 0 ) {
    throw createError( { status: 400, message: "Distance is not compatible with course length" } )
  }

  const lengthCount = Math.round( distanceM / poolLengthM )
  const turnCount = Math.max( 0, lengthCount - 1 )

  const markersIn = Array.isArray( body?.markers ) ? body.markers : []
  const markers = markersIn
    .map( ( m ) => ( {
      type: m?.type === "surfacing" || m?.type === "split" ? m.type : null,
      code: asNonEmptyString( m?.code ),
      label: asNonEmptyString( m?.label ),
      lengthIndex: asPositiveIntOrNull( m?.lengthIndex ),
      turnIndex: asPositiveIntOrNull( m?.turnIndex ),
      tMs: asUnsignedIntOrNull( m?.tMs ),
    } ) )
    .filter( ( m ) => m.type && m.code && m.label && m.tMs !== null ) as Array<{
      type: MarkerType
      code: string
      label: string
      lengthIndex: number | null
      turnIndex: number | null
      tMs: number
    }>

  for ( const marker of markers ) {
    if ( marker.lengthIndex !== null && ( marker.lengthIndex < 1 || marker.lengthIndex > lengthCount ) ) {
      throw createError( { status: 400, message: `Invalid marker lengthIndex: ${marker.lengthIndex}` } )
    }
    if ( marker.turnIndex !== null && ( marker.turnIndex < 1 || marker.turnIndex > turnCount ) ) {
      throw createError( { status: 400, message: `Invalid marker turnIndex: ${marker.turnIndex}` } )
    }
  }

  const breakoutStartM = asDecimalOrNull(
    body?.analysis?.breakoutStartM ?? body?.analysis?.start?.breakoutM
  )

  const strokeCountsIn =
    Array.isArray( body?.strokeCounts )
      ? body.strokeCounts
      : Array.isArray( body?.analysis?.strokeCounts )
        ? body.analysis.strokeCounts
        : []

  const strokeCounts = strokeCountsIn
    .map( ( item ) => ( {
      lengthIndex: asPositiveIntOrNull( item?.lengthIndex ),
      fromM: asDecimalOrNull( item?.fromM ),
      toM: asDecimalOrNull( item?.toM ),
      count: asUnsignedIntOrNull( item?.count ),
    } ) )
    .filter( item => item.lengthIndex !== null && item.fromM !== null && item.toM !== null ) as Array<{
      lengthIndex: number
      fromM: number
      toM: number
      count: number | null
    }>

  for ( const item of strokeCounts ) {
    if ( item.lengthIndex < 1 || item.lengthIndex > lengthCount ) {
      throw createError( { status: 400, message: `Invalid stroke count lengthIndex: ${item.lengthIndex}` } )
    }
    if ( !( item.fromM >= 0 ) || !( item.toM > item.fromM ) || item.toM > distanceM ) {
      throw createError( { status: 400, message: `Invalid stroke count range for lengthIndex: ${item.lengthIndex}` } )
    }
  }

  const strokeCountIndexSet = new Set<number>()
  for ( const item of strokeCounts ) {
    if ( strokeCountIndexSet.has( item.lengthIndex ) ) {
      throw createError( { status: 400, message: `Duplicate stroke count lengthIndex: ${item.lengthIndex}` } )
    }
    strokeCountIndexSet.add( item.lengthIndex )
  }

  const turnsIn =
    Array.isArray( body?.turns )
      ? body.turns
      : Array.isArray( body?.analysis?.turns )
        ? body.analysis.turns
        : []

  const turns = turnsIn
    .map( ( item ) => ( {
      turnIndex: asPositiveIntOrNull( item?.turnIndex ),
      breakoutM: asDecimalOrNull( item?.breakoutM ),
    } ) )
    .filter( item => item.turnIndex !== null ) as Array<{
      turnIndex: number
      breakoutM: number | null
    }>

  for ( const item of turns ) {
    if ( item.turnIndex < 1 || item.turnIndex > turnCount ) {
      throw createError( { status: 400, message: `Invalid turnIndex: ${item.turnIndex}` } )
    }
  }

  const turnIndexSet = new Set<number>()
  for ( const item of turns ) {
    if ( turnIndexSet.has( item.turnIndex ) ) {
      throw createError( { status: 400, message: `Duplicate turnIndex: ${item.turnIndex}` } )
    }
    turnIndexSet.add( item.turnIndex )
  }

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const upsertVideo = prepareStatement(
      conn,
      `
      INSERT INTO VideoTimerVideos (
        id,
        userId,
        playbackUrl,
        originalName,
        mimeType,
        size,
        durationMs
      )
      VALUES (
        :id,
        :userId,
        :playbackUrl,
        :originalName,
        :mimeType,
        :size,
        :durationMs
      )
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
        poolLengthM,
        lengthCount,
        turnCount,
        officialFinishMs,
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
        :poolLengthM,
        :lengthCount,
        :turnCount,
        :officialFinishMs,
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
      poolLengthM,
      lengthCount,
      turnCount,
      officialFinishMs,
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
        INSERT INTO VideoTimerMarkers (
          sessionId,
          seq,
          type,
          code,
          label,
          lengthIndex,
          turnIndex,
          tMs
        )
        VALUES (
          :sessionId,
          :seq,
          :type,
          :code,
          :label,
          :lengthIndex,
          :turnIndex,
          :tMs
        )
        `
      )

      for ( let i = 0; i < markers.length; i++ ) {
        const marker = markers[i]!
        await insertMarker.run( {
          sessionId,
          seq: i + 1,
          type: marker.type,
          code: marker.code,
          label: marker.label,
          lengthIndex: marker.lengthIndex,
          turnIndex: marker.turnIndex,
          tMs: marker.tMs,
        } )
      }
    }

    const insertSessionAnalysis = prepareStatement(
      conn,
      `
      INSERT INTO VideoTimerSessionAnalysis (
        sessionId,
        breakoutStartM
      )
      VALUES (
        :sessionId,
        :breakoutStartM
      )
      `
    )

    await insertSessionAnalysis.run( {
      sessionId,
      breakoutStartM,
    } )

    if ( strokeCounts.length ) {
      const insertStrokeCount = prepareStatement(
        conn,
        `
        INSERT INTO VideoTimerSessionStrokeCounts (
          sessionId,
          lengthIndex,
          fromM,
          toM,
          count
        )
        VALUES (
          :sessionId,
          :lengthIndex,
          :fromM,
          :toM,
          :count
        )
        `
      )

      for ( const item of strokeCounts ) {
        await insertStrokeCount.run( {
          sessionId,
          lengthIndex: item.lengthIndex,
          fromM: item.fromM,
          toM: item.toM,
          count: item.count,
        } )
      }
    }

    if ( turns.length ) {
      const insertTurn = prepareStatement(
        conn,
        `
        INSERT INTO VideoTimerSessionTurns (
          sessionId,
          turnIndex,
          breakoutM
        )
        VALUES (
          :sessionId,
          :turnIndex,
          :breakoutM
        )
        `
      )

      for ( const item of turns ) {
        await insertTurn.run( {
          sessionId,
          turnIndex: item.turnIndex,
          breakoutM: item.breakoutM,
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