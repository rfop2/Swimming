import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getRouterParam, readBody } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type MarkerType = "surfacing" | "split"

type Body = {
  selections: {
    course: string
    stroke: string
    distance: string
  }
  swimmerId?: string | null
  notes?: string
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

const asNonEmptyString = ( v: unknown ) => ( typeof v === "string" && v.trim() ? v.trim() : null )

const asInt = ( v: unknown ) => {
  const n = typeof v === "number" ? v : Number( v )
  if ( !Number.isFinite( n ) ) return null
  return Math.round( n )
}

const asUnsignedIntOrNull = ( v: unknown ) => {
  if ( v === null || v === undefined || v === "" ) return null
  const n = asInt( v )
  if ( n === null || n < 0 ) return null
  return n
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

  const sessionId = String( getRouterParam( event, "id" ) ?? "" ).trim()
  if ( !sessionId ) throw createError( { status: 400, message: "Missing id" } )

  let body: Body
  try {
    body = await readBody<Body>( event )
  } catch {
    throw createError( { status: 400, message: "Invalid JSON body" } )
  }

  const course = asNonEmptyString( body?.selections?.course )
  const stroke = asNonEmptyString( body?.selections?.stroke )
  const distance = asNonEmptyString( body?.selections?.distance )

  if ( !course || !stroke || !distance ) {
    throw createError( { status: 400, message: "Missing selections" } )
  }

  const swimmerId = body?.swimmerId ? asNonEmptyString( body.swimmerId ) : null
  const notes = typeof body?.notes === "string" ? body.notes : null
  const startOffsetMs = asUnsignedIntOrNull( body?.startOffsetMs )

  const resultSwimmer = body?.resultSwimmer ? asNonEmptyString( body.resultSwimmer ) : null
  const resultCourse = body?.resultCourse ? asNonEmptyString( body.resultCourse ) : null
  const resultStroke = body?.resultStroke ? asNonEmptyString( body.resultStroke ) : null
  const resultDistance = body?.resultDistance ? asNonEmptyString( body.resultDistance ) : null
  const resultSeq = asUnsignedIntOrNull( body?.resultSeq )

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

  const markers = ( Array.isArray( body?.markers ) ? body.markers : [] )
    .map( m => ( {
      type: m?.type === "surfacing" || m?.type === "split" ? m.type : null,
      code: asNonEmptyString( m?.code ),
      label: asNonEmptyString( m?.label ),
      lengthIndex: asPositiveIntOrNull( m?.lengthIndex ),
      turnIndex: asPositiveIntOrNull( m?.turnIndex ),
      tMs: asUnsignedIntOrNull( m?.tMs ),
    } ) )
    .filter( m => m.type && m.code && m.label && m.tMs !== null ) as Array<{
      type: MarkerType
      code: string
      label: string
      lengthIndex: number | null
      turnIndex: number | null
      tMs: number
    }>

  const breakoutStartM = asDecimalOrNull( body?.analysis?.breakoutStartM )

  const strokeCounts = ( Array.isArray( body?.strokeCounts ) ? body.strokeCounts : [] )
    .map( item => ( {
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

  const turns = ( Array.isArray( body?.turns ) ? body.turns : [] )
    .map( item => ( {
      turnIndex: asPositiveIntOrNull( item?.turnIndex ),
      breakoutM: asDecimalOrNull( item?.breakoutM ),
    } ) )
    .filter( item => item.turnIndex !== null ) as Array<{
      turnIndex: number
      breakoutM: number | null
    }>

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

    const updateSession = prepareStatement(
      conn,
      `
      UPDATE VideoTimerSessions
      SET
        swimmerId = :swimmerId,
        course = :course,
        stroke = :stroke,
        distance = :distance,
        poolLengthM = :poolLengthM,
        lengthCount = :lengthCount,
        turnCount = :turnCount,
        startOffsetMs = :startOffsetMs,
        notes = :notes,
        resultSwimmer = :resultSwimmer,
        resultCourse = :resultCourse,
        resultStroke = :resultStroke,
        resultDistance = :resultDistance,
        resultSeq = :resultSeq,
        updated = current_timestamp()
      WHERE id = :id AND userId = :userId
      `
    )

    await updateSession.run( {
      id: sessionId,
      userId,
      swimmerId,
      course,
      stroke,
      distance,
      poolLengthM,
      lengthCount,
      turnCount,
      startOffsetMs,
      notes,
      resultSwimmer,
      resultCourse,
      resultStroke,
      resultDistance,
      resultSeq,
    } )

    const deleteMarkers = prepareStatement(
      conn,
      "DELETE FROM VideoTimerMarkers WHERE sessionId = :sessionId"
    )
    await deleteMarkers.run( { sessionId } )

    const deleteAnalysis = prepareStatement(
      conn,
      "DELETE FROM VideoTimerSessionAnalysis WHERE sessionId = :sessionId"
    )
    await deleteAnalysis.run( { sessionId } )

    const deleteStrokeCounts = prepareStatement(
      conn,
      "DELETE FROM VideoTimerSessionStrokeCounts WHERE sessionId = :sessionId"
    )
    await deleteStrokeCounts.run( { sessionId } )

    const deleteTurns = prepareStatement(
      conn,
      "DELETE FROM VideoTimerSessionTurns WHERE sessionId = :sessionId"
    )
    await deleteTurns.run( { sessionId } )

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

    const insertAnalysis = prepareStatement(
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

    await insertAnalysis.run( {
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

    if ( error && typeof error === "object" && "statusCode" in error ) throw error

    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw createError( { status: 500, message: "Unable to update video timer session" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )