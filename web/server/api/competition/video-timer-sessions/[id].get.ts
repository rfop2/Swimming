import type {
  PoolConnection,
  VideoTimerBreathCountRecord,
  VideoTimerBreathMarkerRecord,
  VideoTimerMarkerRecord,
  VideoTimerStrokeCountRecord,
  VideoTimerStrokeMarkerRecord,
  VideoTimerTurnAnalysisRecord,
} from "lib"
import { buildVideoTimerComputedAnalysis, getPool, isMySql2Error, prepareStatement } from "lib"
import { createError, defineEventHandler, getRouterParam } from "h3"

type SessionRow = {
  id: string
  created: string
  notes: string | null
  course: string
  stroke: string
  distance: string
  startOffsetMs: number | null
  resultSwimmer: string | null
  resultCourse: string | null
  resultStroke: string | null
  resultDistance: string | null
  resultSeq: string | null
  resultDate: string | null
  resultName: string | null
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
  lengthIndex: number | null
  turnIndex: number | null
}

type AnalysisRow = {
  breakoutStartM: number | null
}

type StrokeCountRow = {
  lengthIndex: number
  fromM: number
  toM: number
  count: number | null
}

type BreathCountRow = {
  lengthIndex: number
  fromM: number
  toM: number
  count: number | null
}

type BreathMarkerRow = {
  id: number
  seq: number
  lengthIndex: number
  fromM: number
  toM: number
  tMs: number
}

type StrokeMarkerRow = {
  id: number
  seq: number
  lengthIndex: number
  fromM: number
  toM: number
  tMs: number
}

type TurnRow = {
  turnIndex: number
  breakoutM: number | null
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
        s.resultSwimmer as resultSwimmer,
        s.resultCourse as resultCourse,
        s.resultStroke as resultStroke,
        s.resultDistance as resultDistance,
        s.resultSeq as resultSeq,
        r.date as resultDate,
        r.meet as resultName,
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
      LEFT JOIN Results r
        ON r.swimmer = s.resultSwimmer
        AND r.course = s.resultCourse
        AND r.stroke = s.resultStroke
        AND r.distance = s.resultDistance
        AND r.seq = s.resultSeq
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
        m.seq as seq,
        m.lengthIndex as lengthIndex,
        m.turnIndex as turnIndex
      FROM VideoTimerMarkers m
      WHERE m.sessionId = :sessionId
      ORDER BY m.seq ASC
      `
    )

    const markerRows = ( await getMarkers.all( { sessionId: id } ) ) as MarkerRow[]

    const markers: VideoTimerMarkerRecord[] = markerRows.map( marker => ( {
      id: `${row.id}-${marker.seq}`,
      seq: Number( marker.seq ) || 0,
      type: marker.type,
      code: marker.code,
      label: marker.label,
      lengthIndex: marker.lengthIndex !== null ? Number( marker.lengthIndex ) : null,
      turnIndex: marker.turnIndex !== null ? Number( marker.turnIndex ) : null,
      tMs: Number( marker.tMs ) || 0,
    } ) )

    const getAnalysis = prepareStatement(
      conn,
      `
      SELECT
        a.breakoutStartM as breakoutStartM
      FROM VideoTimerSessionAnalysis a
      WHERE a.sessionId = :sessionId
      LIMIT 1
      `
    )

    const analysisRow = ( await getAnalysis.get( { sessionId: id } ) ) as AnalysisRow | undefined

    const getStrokeCounts = prepareStatement(
      conn,
      `
      SELECT
        sc.lengthIndex as lengthIndex,
        sc.fromM as fromM,
        sc.toM as toM,
        sc.count as count
      FROM VideoTimerSessionStrokeCounts sc
      WHERE sc.sessionId = :sessionId
      ORDER BY sc.lengthIndex ASC
      `
    )

    const strokeCountRows = ( await getStrokeCounts.all( { sessionId: id } ) ) as StrokeCountRow[]

    const strokeCounts: VideoTimerStrokeCountRecord[] = strokeCountRows.map( row => ( {
      lengthIndex: Number( row.lengthIndex ) || 0,
      fromM: Number( row.fromM ) || 0,
      toM: Number( row.toM ) || 0,
      count: row.count !== null ? Number( row.count ) : null,
    } ) )

    const getStrokeMarkers = prepareStatement(
      conn,
      `
      SELECT
        sm.id as id,
        sm.seq as seq,
        sm.lengthIndex as lengthIndex,
        sm.fromM as fromM,
        sm.toM as toM,
        sm.tMs as tMs
      FROM VideoTimerSessionStrokeMarkers sm
      WHERE sm.sessionId = :sessionId
      ORDER BY sm.seq ASC
      `
    )

    const strokeMarkerRows = ( await getStrokeMarkers.all( { sessionId: id } ) ) as StrokeMarkerRow[]

    const strokeMarkers: VideoTimerStrokeMarkerRecord[] = strokeMarkerRows.map( row => ( {
      id: `${id}-stroke-${row.id}`,
      seq: Number( row.seq ) || 0,
      lengthIndex: Number( row.lengthIndex ) || 0,
      fromM: Number( row.fromM ) || 0,
      toM: Number( row.toM ) || 0,
      tMs: Number( row.tMs ) || 0,
    } ) )

    const getBreathCounts = prepareStatement(
      conn,
      `
      SELECT
        bc.lengthIndex as lengthIndex,
        bc.fromM as fromM,
        bc.toM as toM,
        bc.count as count
      FROM VideoTimerSessionBreathCounts bc
      WHERE bc.sessionId = :sessionId
      ORDER BY bc.lengthIndex ASC
      `
    )

    const breathCountRows = ( await getBreathCounts.all( { sessionId: id } ) ) as BreathCountRow[]

    const breathCounts: VideoTimerBreathCountRecord[] = breathCountRows.map( row => ( {
      lengthIndex: Number( row.lengthIndex ) || 0,
      fromM: Number( row.fromM ) || 0,
      toM: Number( row.toM ) || 0,
      count: row.count !== null ? Number( row.count ) : null,
    } ) )

    const getBreathMarkers = prepareStatement(
      conn,
      `
      SELECT
        bm.id as id,
        bm.seq as seq,
        bm.lengthIndex as lengthIndex,
        bm.fromM as fromM,
        bm.toM as toM,
        bm.tMs as tMs
      FROM VideoTimerSessionBreathMarkers bm
      WHERE bm.sessionId = :sessionId
      ORDER BY bm.seq ASC
      `
    )

    const breathMarkerRows = ( await getBreathMarkers.all( { sessionId: id } ) ) as BreathMarkerRow[]

    const breathMarkers: VideoTimerBreathMarkerRecord[] = breathMarkerRows.map( row => ( {
      id: `${id}-breath-${row.id}`,
      seq: Number( row.seq ) || 0,
      lengthIndex: Number( row.lengthIndex ) || 0,
      fromM: Number( row.fromM ) || 0,
      toM: Number( row.toM ) || 0,
      tMs: Number( row.tMs ) || 0,
    } ) )

    const getTurns = prepareStatement(
      conn,
      `
      SELECT
        t.turnIndex as turnIndex,
        t.breakoutM as breakoutM
      FROM VideoTimerSessionTurns t
      WHERE t.sessionId = :sessionId
      ORDER BY t.turnIndex ASC
      `
    )

    const turnRows = ( await getTurns.all( { sessionId: id } ) ) as TurnRow[]

    const turns: VideoTimerTurnAnalysisRecord[] = turnRows.map( row => ( {
      turnIndex: Number( row.turnIndex ) || 0,
      breakoutM: row.breakoutM !== null ? Number( row.breakoutM ) : null,
    } ) )

    const analysis =
      analysisRow
        ? {
          breakoutStartM: analysisRow.breakoutStartM !== null ? Number( analysisRow.breakoutStartM ) : null,
        }
        : null

    const computed = buildVideoTimerComputedAnalysis( {
      course: row.course,
      distance: row.distance,
      startOffsetMs: row.startOffsetMs ?? null,
      markers,
      analysis,
      strokeCounts,
      strokeMarkers,
      breathCounts,
      breathMarkers,
      turns,
    } )

    return {
      id: row.id,
      createdAt: row.created,
      notes: row.notes,
      startOffsetMs: row.startOffsetMs ?? null,
      resultDate: row.resultDate ?? null,
      resultName: row.resultName ?? null,
      resultLink: {
        resultSwimmer: row.resultSwimmer ?? null,
        resultCourse: row.resultCourse ?? null,
        resultStroke: row.resultStroke ?? null,
        resultDistance: row.resultDistance ?? null,
        resultSeq: row.resultSeq ?? null,
        resultDate: row.resultDate ?? null,
      },
      selections: {
        course: row.course,
        stroke: row.stroke,
        distance: row.distance,
      },
      swimmer: row.swimmerId ? { id: row.swimmerId, fullName: row.swimmerName ?? "" } : null,
      video: {
        id: row.videoId,
        playbackUrl: row.playbackUrl,
        originalName: row.originalName,
        mimeType: row.mimeType,
        size: row.size,
        durationMs: row.durationMs ?? undefined,
      },
      markers,
      analysis,
      strokeCounts,
      strokeMarkers,
      breathCounts,
      breathMarkers,
      turns,
      computed,
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
