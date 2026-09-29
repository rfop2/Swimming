import type { PoolConnection } from "lib"
import { createError, defineEventHandler, getRouterParam } from "h3"
import { getPool, isMySql2Error, prepareStatement } from "lib"

type Row = {
  id: string
  created: string
  updated: string | null
  playbackUrl: string
  originalName: string
  mimeType: string
  size: number
  durationMs: number | null
  sessionId: string | null
  swimmerId: string | null
  swimmerName: string | null
  course: string | null
  stroke: string | null
  distance: string | null
  videoNotes: string | null
  sessionNotes: string | null
  resultDate: string | null
  resultMeetName: string | null
  officialFinishMs: number | null
  startOffsetMs: number | null
  markersCount: number | null
  compressionStatusId: number | null
  compressionStatusCode: string | null
  compressionStatusName: string | null
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) throw createError( { status: 401 } )

  const userId = event.context.user.id
  if ( !userId ) throw createError( { status: 401 } )

  const id = String( getRouterParam( event, "id" ) || "" ).trim()
  if ( !id ) throw createError( { status: 400, message: "Missing video id" } )

  const pool = await getPool()
  const conn: PoolConnection = await pool.getConnection()

  const VIDEO_COMPRESSION_STATUS_IDS = {
    none: 1,
    pending: 2,
    queued: 3,
    processing: 4,
    completed: 5,
    failed: 6,
  } as const

  try {
    const stmt = prepareStatement(
      conn,
      `
      SELECT
        v.id as id,
        v.created as created,
        v.updated as updated,
        v.playbackUrl as playbackUrl,
        v.originalName as originalName,
        v.mimeType as mimeType,
        v.size as size,
        v.durationMs as durationMs,
        v.notes as videoNotes,
        s.id as sessionId,
        s.swimmerId as swimmerId,
        sw.fullName as swimmerName,
        s.course as course,
        s.stroke as stroke,
        s.distance as distance,
        s.notes as sessionNotes,
        r.date as resultDate,
        r.meet as resultMeetName,
        s.officialFinishMs as officialFinishMs,
        s.startOffsetMs as startOffsetMs,
        v.compressionStatusId,
        cs.code AS compressionStatusCode,
        cs.name AS compressionStatusName,
        (
          SELECT COUNT(*)
          FROM VideoTimerMarkers m
          WHERE m.sessionId = s.id
        ) as markersCount
      FROM VideoTimerVideos v
      LEFT JOIN VideoTimerSessions s
        ON s.videoId = v.id
        AND s.userId = v.userId
      LEFT JOIN Swimmers sw
        ON sw.id = s.swimmerId
      LEFT JOIN Results r
        ON r.swimmer = s.resultSwimmer
        AND r.course = s.resultCourse
        AND r.stroke = s.resultStroke
        AND r.distance = s.resultDistance
        AND r.seq = s.resultSeq
      LEFT JOIN VideoTimerVideoCompressionStatuses cs
        ON cs.id = v.compressionStatusId
      WHERE v.userId = :userId
        AND v.id = :id
      LIMIT 1
      `
    )

    const rows = ( await stmt.all( { userId, id } ) ) as Row[]
    const row = rows[0]

    if ( !row ) {
      throw createError( { status: 404, message: "Video not found" } )
    }

    const isCompressionReady =
      row.compressionStatusId === VIDEO_COMPRESSION_STATUS_IDS.none
      || row.compressionStatusId === VIDEO_COMPRESSION_STATUS_IDS.completed

    return {
      id: row.id,
      createdAt: row.created,
      updatedAt: row.updated,
      playbackUrl: row.playbackUrl,
      originalName: row.originalName,
      mimeType: row.mimeType,
      size: Number( row.size ) || 0,
      durationMs: row.durationMs === null ? null : Number( row.durationMs ),
      sessionId: row.sessionId || null,
      isLinkedToSession: !!row.sessionId,
      canCreateSession: !row.sessionId && isCompressionReady,
      compressionStatusId: row.compressionStatusId === null ? null : Number( row.compressionStatusId ),
      compressionStatusCode: row.compressionStatusCode || null,
      compressionStatusName: row.compressionStatusName || null,
      isCompressionReady,
      swimmerId: row.swimmerId || null,
      swimmerName: row.swimmerName || null,
      course: row.course || null,
      stroke: row.stroke || null,
      distance: row.distance || null,
      notes: row.videoNotes || null,
      sessionNotes: row.sessionNotes || null,
      meetName: row.resultMeetName || null,
      meetDate: row.resultDate || null,
      officialFinishMs: row.officialFinishMs === null ? null : Number( row.officialFinishMs ),
      startOffsetMs: row.startOffsetMs === null ? null : Number( row.startOffsetMs ),
      markersCount: row.markersCount === null ? 0 : Number( row.markersCount ),
    }
  } catch ( error ) {
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }

    throw error instanceof Error && "statusCode" in error
      ? error
      : createError( { status: 500, message: "Unable to load video timer library item" } )
  } finally {
    try {
      conn.release()
    } catch ( err ) {
      void err
    }
  }
} )
