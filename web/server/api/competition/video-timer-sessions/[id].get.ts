import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getRouterParam } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type SessionRow = {
  id: string
  created: string
  notes: string | null
  course: string
  stroke: string
  distance: string
  startOffsetMs: number | null
  meetId: string | null
  meetName: string | null
  swimmerId: string | null
  swimmerName: string | null
  videoId: string
  playbackUrl: string
  originalName: string
  mimeType: string
  size: number
  durationMs: number | null
}

type MarkerRow = {
  type: "surfacing" | "split"
  code: string
  label: string
  tMs: number
  seq: number
}

type AnalysisRow = {
  count10to50: number | null
  count60to100: number | null
  reactionMs: number | null
  breakoutStartM: number | null
  turnRotationMs: number | null
  breakoutTurnM: number | null
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )
  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const rawId = getRouterParam( event, "id" ) || ""
  const id = String( rawId ).trim()
  if ( !id ) throw createError( { status: 400, message: "Missing id" } )

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  try {
    const getSession = prepareStatement(
      conn,
      `
      SELECT
        s.id as id,
        s.created as created,
        s.notes as notes,
        s.course as course,
        s.stroke as stroke,
        s.distance as distance,
        s.startOffsetMs as startOffsetMs,
        s.meetId as meetId,
        mt.name as meetName,
        s.swimmerId as swimmerId,
        sw.fullName as swimmerName,
        v.id as videoId,
        v.playbackUrl as playbackUrl,
        v.originalName as originalName,
        v.mimeType as mimeType,
        v.size as size,
        v.durationMs as durationMs
      FROM VideoTimerSessions s
      INNER JOIN VideoTimerVideos v ON v.id = s.videoId
      LEFT JOIN Swimmers sw ON sw.id = s.swimmerId
      LEFT JOIN Meets mt ON mt.id = s.meetId
      WHERE s.id = :id AND s.userId = :userId
      LIMIT 1
      `
    )

    const row = ( await getSession.get( { id, userId } ) ) as SessionRow | undefined
    if ( !row ) throw createError( { status: 404, message: "Session not found" } )

    const getMarkers = prepareStatement(
      conn,
      `
      SELECT
        m.type as type,
        m.code as code,
        m.label as label,
        m.tMs as tMs,
        m.seq as seq
      FROM VideoTimerMarkers m
      WHERE m.sessionId = :sessionId
      ORDER BY m.seq ASC
      `
    )

    const markers = ( await getMarkers.all( { sessionId: id } ) ) as MarkerRow[]

    const getAnalysis = prepareStatement(
      conn,
      `
      SELECT
        a.count10to50 as count10to50,
        a.count60to100 as count60to100,
        a.reactionMs as reactionMs,
        a.breakoutStartM as breakoutStartM,
        a.turnRotationMs as turnRotationMs,
        a.breakoutTurnM as breakoutTurnM
      FROM VideoTimerSessionAnalysis a
      WHERE a.sessionId = :sessionId
      LIMIT 1
      `
    )

    const analysisRow = ( await getAnalysis.get( { sessionId: id } ) ) as AnalysisRow | undefined

    return {
      id: row.id,
      createdAt: row.created,
      notes: row.notes,
      startOffsetMs: row.startOffsetMs ?? null,
      selections: { course: row.course, stroke: row.stroke, distance: row.distance },
      swimmer: row.swimmerId ? { id: row.swimmerId, fullName: row.swimmerName ?? "" } : null,
      meet: row.meetId ? { id: row.meetId, name: row.meetName ?? "" } : null,
      video: {
        id: row.videoId,
        playbackUrl: row.playbackUrl,
        originalName: row.originalName,
        mimeType: row.mimeType,
        size: row.size,
        durationMs: row.durationMs ?? undefined,
      },
      markers: markers.map( ( m ) => ( {
        id: `${row.id}-${m.seq}`,
        type: m.type,
        code: m.code,
        label: m.label,
        tMs: Number( m.tMs ) || 0,
      } ) ),
      analysis: analysisRow
        ? {
          count10to50: analysisRow.count10to50 !== null ? Number( analysisRow.count10to50 ) : null,
          count60to100: analysisRow.count60to100 !== null ? Number( analysisRow.count60to100 ) : null,
          reactionMs: analysisRow.reactionMs !== null ? Number( analysisRow.reactionMs ) : null,
          breakoutStartM: analysisRow.breakoutStartM !== null ? Number( analysisRow.breakoutStartM ) : null,
          turnRotationMs: analysisRow.turnRotationMs !== null ? Number( analysisRow.turnRotationMs ) : null,
          breakoutTurnM: analysisRow.breakoutTurnM !== null ? Number( analysisRow.breakoutTurnM ) : null,
        }
        : null,
    }
  } catch ( error ) {
    if ( error && typeof error === "object" && "statusCode" in error ) throw error

    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }
    throw createError( { status: 500, message: "Unable to load video timer session" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )