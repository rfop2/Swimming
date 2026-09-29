import { unlink } from "node:fs/promises"
import { basename, join } from "node:path"
import { courseTypes, getPool, prepareStatement, STROKE_DISTANCE, type CourseType, type MeetMeta } from "lib"

type MetaBody = Partial<Pick<MeetMeta, "meetInfo" | "poolId" | "meetPack" | "course" | "events">>

export default defineEventHandler( async ( event ) => {
  const meetId = getRouterParam( event, "id" )
  if ( !meetId ) {
    throw createError( {
      message: "No meet id supplied",
      status: 400,
    } )
  }
  const clubId = await requireMeetOwner( event, meetId )

  const body = await readBody<MetaBody>( event )
  const meetInfo = body.meetInfo?.trim() || null
  const poolId = body.poolId ? Number( body.poolId ) : null
  if ( poolId !== null && !Number.isInteger( poolId ) ) {
    throw createError( {
      message: "Invalid pool id",
      status: 400,
    } )
  }
  const course = body.course ?? null
  if ( course !== null && !courseTypes.includes( course as CourseType ) ) {
    throw createError( {
      message: "Invalid course",
      status: 400,
    } )
  }
  const events = body.events ?? []
  if ( !Array.isArray( events ) || events.some( e => typeof e !== "string" || !( e in STROKE_DISTANCE ) ) ) {
    throw createError( {
      message: "Invalid events",
      status: 400,
    } )
  }

  const pool = await getPool()
  const selectMeta = prepareStatement<{ meetId: string }, Pick<MeetMeta, "meetPack">>(
    pool,
    "SELECT meetPack FROM MeetsMeta WHERE meetId = :meetId"
  )
  const existingPack = ( await selectMeta.get( { meetId } ) )?.meetPack ?? null
  // Packs are only set by uploading, so the only change allowed here is removing it
  const removePack = !!existingPack && body.meetPack === null

  try {
    const upsertMeta = prepareStatement<{ meetId: string, meetInfo: string | null, poolId: number | null, course: string | null, events: string | null, clubId: string, meetPack: string | null }>(
      pool,
      `INSERT INTO MeetsMeta (meetId, meetInfo, poolId, course, events, clubId, meetPack)
        VALUES (:meetId, :meetInfo, :poolId, :course, :events, :clubId, :meetPack)
        ON DUPLICATE KEY UPDATE
          meetInfo = VALUES(meetInfo),
          poolId = VALUES(poolId),
          course = VALUES(course),
          events = VALUES(events),
          clubId = VALUES(clubId),
          meetPack = VALUES(meetPack)`
    )
    await upsertMeta.run( {
      meetId,
      meetInfo,
      poolId,
      course,
      // Stored in STROKE_DISTANCE order so the JSON is stable regardless of click order
      events: events.length ? JSON.stringify( Object.keys( STROKE_DISTANCE ).filter( k => events.includes( k ) ) ) : null,
      clubId,
      meetPack: removePack ? null : existingPack,
    } )
  } catch ( error ) {
    console.error( error )
    throw createError( {
      message: "Unable to update meet details",
      status: 500
    } )
  }

  if ( removePack && existingPack ) {
    await unlink( join( meetPackDir(), basename( existingPack ) ) ).catch( () => undefined )
  }
} )
