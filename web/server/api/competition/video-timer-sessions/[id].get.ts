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
  tMs: number
  seq: number
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
        s.meetId as meetId,
        mt.name as meetName,
        s.swimmerId as swimmerId,
        sw.fullName as swimmerName,
        sw.firstName,
        sw.lastName,
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
        m.tMs as tMs,
        m.seq as seq
      FROM VideoTimerMarkers m
      WHERE m.sessionId = :sessionId
      ORDER BY m.seq ASC
      `
    )

    const markers = ( await getMarkers.all( { sessionId: id } ) ) as MarkerRow[]

    return {
      id: row.id,
      createdAt: row.created,
      notes: row.notes,
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
        tMs: Number( m.tMs ) || 0,
      } ) ),
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
