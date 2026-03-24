import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getRouterParam, readBody } from "h3"
import { getPool, isMySql2Error } from "lib"

type PatchBody = {
  resultSwimmer?: string | null
  resultCourse?: string | null
  resultStroke?: string | null
  resultDistance?: string | null
  resultSeq?: string | null
}

type SessionRow = {
  id: string
  userId: string
  swimmerId: string
  course: string
  stroke: string
  distance: string
}

type ResultRow = {
  swimmer: string
  course: string
  stroke: string
  distance: string
  seq: string
}

type ExistingLinkRow = {
  id: string
}

const normalizeNullableString = ( value: unknown ) => {
  if ( value === null || value === undefined ) return null
  const normalized = String( value ).trim()
  return normalized ? normalized : null
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { statusCode: 401, statusMessage: "Unauthorized" } )
  }

  const userId = String( event.context.user.id || "" ).trim()
  if ( !userId ) {
    throw createError( { statusCode: 401, statusMessage: "Unauthorized" } )
  }

  const sessionId = String( getRouterParam( event, "id" ) || "" ).trim()
  if ( !sessionId ) {
    throw createError( { statusCode: 400, statusMessage: "Missing session id" } )
  }

  const body = await readBody<PatchBody>( event )

  const resultSwimmer = normalizeNullableString( body?.resultSwimmer )
  const resultCourse = normalizeNullableString( body?.resultCourse )
  const resultStroke = normalizeNullableString( body?.resultStroke )
  const resultDistance = normalizeNullableString( body?.resultDistance )
  const resultSeq = normalizeNullableString( body?.resultSeq )

  const isClear =
    resultSwimmer === null &&
    resultCourse === null &&
    resultStroke === null &&
    resultDistance === null &&
    resultSeq === null

  const isFull =
    !!resultSwimmer &&
    !!resultCourse &&
    !!resultStroke &&
    !!resultDistance &&
    !!resultSeq

  if ( !isClear && !isFull ) {
    throw createError( {
      statusCode: 400,
      statusMessage: "Result payload must be fully filled or fully null",
    } )
  }

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const [ sessionRows ] = await conn.query(
      `
      SELECT
        id,
        userId,
        swimmerId,
        course,
        stroke,
        distance
      FROM VideoTimerSessions
      WHERE id = ?
        AND userId = ?
      LIMIT 1
      `,
      [ sessionId, userId ]
    ) as [ SessionRow[], unknown ]

    const session = sessionRows[0] ?? null

    if ( !session ) {
      throw createError( { statusCode: 404, statusMessage: "Session not found" } )
    }

    if ( isClear ) {
      await conn.query(
        `
        UPDATE VideoTimerSessions
        SET
          resultSwimmer = NULL,
          resultCourse = NULL,
          resultStroke = NULL,
          resultDistance = NULL,
          resultSeq = NULL,
          updated = NOW()
        WHERE id = ?
          AND userId = ?
        LIMIT 1
        `,
        [ sessionId, userId ]
      )

      return { ok: true }
    }

    if (
      resultSwimmer !== session.swimmerId
      || resultCourse !== session.course
      || resultStroke !== session.stroke
      || resultDistance !== session.distance
    ) {
      throw createError( {
        statusCode: 400,
        statusMessage: "Selected result does not match this session swimmer and selections",
      } )
    }

    const [ resultRows ] = await conn.query(
      `
      SELECT
        swimmer,
        course,
        stroke,
        distance,
        seq
      FROM Results
      WHERE swimmer = ?
        AND course = ?
        AND stroke = ?
        AND distance = ?
        AND seq = ?
      LIMIT 1
      `,
      [ resultSwimmer, resultCourse, resultStroke, resultDistance, resultSeq ]
    ) as [ ResultRow[], unknown ]

    const result = resultRows[0] ?? null

    if ( !result ) {
      throw createError( { statusCode: 404, statusMessage: "Result not found" } )
    }

    const [ existingLinkRows ] = await conn.query(
      `
      SELECT id
      FROM VideoTimerSessions
      WHERE userId = ?
        AND id <> ?
        AND resultSwimmer = ?
        AND resultCourse = ?
        AND resultStroke = ?
        AND resultDistance = ?
        AND resultSeq = ?
      LIMIT 1
      `,
      [ userId, sessionId, resultSwimmer, resultCourse, resultStroke, resultDistance, resultSeq ]
    ) as [ ExistingLinkRow[], unknown ]

    const existingLink = existingLinkRows[0] ?? null

    if ( existingLink ) {
      throw createError( {
        statusCode: 409,
        statusMessage: "This result is already linked to another session",
      } )
    }

    await conn.query(
      `
      UPDATE VideoTimerSessions
      SET
        resultSwimmer = ?,
        resultCourse = ?,
        resultStroke = ?,
        resultDistance = ?,
        resultSeq = ?,
        updated = NOW()
      WHERE id = ?
        AND userId = ?
      LIMIT 1
      `,
      [ resultSwimmer, resultCourse, resultStroke, resultDistance, resultSeq, sessionId, userId ]
    )

    return { ok: true }
  } catch ( error ) {
    if ( ( error as { statusCode?: number } )?.statusCode ) {
      throw error
    }

    if ( isMySql2Error( error ) ) {
      throw createError( {
        statusCode: 500,
        statusMessage: `Database error: ${error.sqlMessage}`,
      } )
    }

    throw createError( {
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : "Unable to update session result",
    } )
  } finally {
    try {
      conn.release()
    } catch {
    // ignore
    }
  }
} )