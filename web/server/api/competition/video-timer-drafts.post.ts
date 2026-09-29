import type { PoolConnection } from "lib"
import { randomUUID } from "node:crypto"
import { createError, defineEventHandler, readBody } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type Body = {
  videoId?: string
  selections?: {
    course?: string
    stroke?: string
    distance?: string
  }
  swimmerId?: string | null
  notes?: string
  officialFinishMs?: number | null
  resultSwimmer?: string | null
  resultCourse?: string | null
  resultStroke?: string | null
  resultDistance?: string | null
  resultSeq?: string | number | null
}

type ExistingRow = { id: string; status: "draft" | "completed" }
type ResultRow = { time: number | string | null }

const asText = ( value: unknown ) => typeof value === "string" && value.trim() ? value.trim() : null

const asUnsignedInt = ( value: unknown ) => {
  if ( value === null || value === undefined || value === "" ) return null
  const number = typeof value === "number" ? value : Number( value )
  if ( !Number.isFinite( number ) || number < 0 ) return null
  return Math.round( number )
}

const parseDistanceM = ( value: string ) => {
  const number = Number( value.replace( /[^\d]/g, "" ) )
  return Number.isFinite( number ) && number > 0 ? Math.round( number ) : null
}

export default defineEventHandler( async event => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )
  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const body = await readBody<Body>( event )
  const videoId = asText( body?.videoId )
  const course = asText( body?.selections?.course )
  const stroke = asText( body?.selections?.stroke )
  const distance = asText( body?.selections?.distance )
  const swimmerId = asText( body?.swimmerId )
  const notes = typeof body?.notes === "string" ? body.notes : null

  if ( !videoId || !course || !stroke || !distance ) {
    throw createError( { status: 400, message: "Missing video or race selections" } )
  }

  const distanceM = parseDistanceM( distance )
  const normalizedCourse = course.toLowerCase()
  const poolLengthM = normalizedCourse === "sc" ? 25 : normalizedCourse === "lc" ? 50 : null
  if ( !distanceM || !poolLengthM || distanceM % poolLengthM !== 0 ) {
    throw createError( { status: 400, message: "Invalid course or distance" } )
  }

  const resultSwimmer = asText( body?.resultSwimmer )
  const resultCourse = asText( body?.resultCourse )
  const resultStroke = asText( body?.resultStroke )
  const resultDistance = asText( body?.resultDistance )
  const resultSeq = asUnsignedInt( body?.resultSeq )
  const resultParts = [ resultSwimmer, resultCourse, resultStroke, resultDistance, resultSeq ]
  const resultIsClear = resultParts.every( value => value === null )
  const resultIsFull = resultParts.every( value => value !== null )

  if ( !resultIsClear && !resultIsFull ) {
    throw createError( { status: 400, message: "Result payload must be fully filled or fully null" } )
  }

  if ( resultIsFull && (
    resultSwimmer !== swimmerId || resultCourse !== course || resultStroke !== stroke || resultDistance !== distance
  ) ) {
    throw createError( { status: 400, message: "Selected result does not match the session details" } )
  }

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const ownedVideo = prepareStatement( conn, `
      SELECT id
      FROM VideoTimerVideos
      WHERE id = :videoId AND userId = :userId
      LIMIT 1
    ` )
    if ( !( await ownedVideo.get( { videoId, userId } ) ) ) {
      throw createError( { status: 404, message: "Video not found" } )
    }

    const existingByVideo = prepareStatement<Record<string, unknown>, ExistingRow>( conn, `
      SELECT id, status
      FROM VideoTimerSessions
      WHERE videoId = :videoId AND userId = :userId
      ORDER BY created DESC
      LIMIT 1
    ` )
    const existing = await existingByVideo.get( { videoId, userId } )
    if ( existing ) {
      await conn.commit()
      return existing
    }

    if ( resultIsFull ) {
      const existingByResult = prepareStatement<Record<string, unknown>, ExistingRow>( conn, `
        SELECT id, status
        FROM VideoTimerSessions
        WHERE userId = :userId
          AND resultSwimmer = :resultSwimmer
          AND resultCourse = :resultCourse
          AND resultStroke = :resultStroke
          AND resultDistance = :resultDistance
          AND resultSeq = :resultSeq
        LIMIT 1
      ` )
      const existingResultSession = await existingByResult.get( {
        userId,
        resultSwimmer,
        resultCourse,
        resultStroke,
        resultDistance,
        resultSeq,
      } )
      if ( existingResultSession ) {
        await conn.commit()
        return existingResultSession
      }
    }

    let officialFinishMs = asUnsignedInt( body?.officialFinishMs )
    if ( resultIsFull ) {
      const resultStatement = prepareStatement<Record<string, unknown>, ResultRow>( conn, `
        SELECT time
        FROM Results
        WHERE swimmer = :resultSwimmer
          AND course = :resultCourse
          AND stroke = :resultStroke
          AND distance = :resultDistance
          AND seq = :resultSeq
        LIMIT 1
      ` )
      const result = await resultStatement.get( {
        resultSwimmer,
        resultCourse,
        resultStroke,
        resultDistance,
        resultSeq,
      } )
      const seconds = Number( result?.time )
      if ( !result || !Number.isFinite( seconds ) || seconds <= 0 ) {
        throw createError( { status: 404, message: "Selected result or its official time was not found" } )
      }
      officialFinishMs = Math.round( seconds * 1000 )
    }

    if ( officialFinishMs === null || officialFinishMs <= 0 ) {
      throw createError( { status: 400, message: "Official finish time is required" } )
    }

    const sessionId = randomUUID()
    const lengthCount = Math.round( distanceM / poolLengthM )
    const insert = prepareStatement( conn, `
      INSERT INTO VideoTimerSessions (
        id, userId, swimmerId, videoId, course, stroke, distance,
        poolLengthM, lengthCount, turnCount, officialFinishMs,
        startOffsetMs, status, draftData, notes,
        resultSwimmer, resultCourse, resultStroke, resultDistance, resultSeq
      ) VALUES (
        :id, :userId, :swimmerId, :videoId, :course, :stroke, :distance,
        :poolLengthM, :lengthCount, :turnCount, :officialFinishMs,
        NULL, 'draft', NULL, :notes,
        :resultSwimmer, :resultCourse, :resultStroke, :resultDistance, :resultSeq
      )
    ` )
    await insert.run( {
      id: sessionId,
      userId,
      swimmerId,
      videoId,
      course,
      stroke,
      distance,
      poolLengthM,
      lengthCount,
      turnCount: Math.max( 0, lengthCount - 1 ),
      officialFinishMs,
      notes,
      resultSwimmer,
      resultCourse,
      resultStroke,
      resultDistance,
      resultSeq,
    } )

    await conn.commit()
    return { id: sessionId, status: "draft" as const }
  } catch ( error ) {
    try {
      await conn.rollback()
    } catch ( rollbackError ) {
      void rollbackError
    }
    if ( error && typeof error === "object" && "statusCode" in error ) throw error
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }
    throw createError( { status: 500, message: "Unable to create draft session" } )
  } finally {
    conn.release()
  }
} )
