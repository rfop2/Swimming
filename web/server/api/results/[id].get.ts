import { getPool, prepareStatement, type ResultsRow } from "lib"

type Params = {
  course: string
  stroke?: string
  distance: string
  startDate: string | null
  endDate: string | null
}

type ResultsRowWithSession = ResultsRow & {
  videoTimerSessionId: string | null
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { status: 401 } )
  }

  const id = getRouterParam( event, "id" )
  if ( !id ) {
    throw createError( { message: "No swimmer id supplied", status: 400 } )
  }

  const userId = event.context.user.id

  const baseJoin = `
    FROM Results r
    LEFT JOIN VideoTimerSessions s
      ON s.userId = :userId
     AND s.resultSwimmer = r.swimmer
     AND s.resultCourse = r.course
     AND s.resultStroke = r.stroke
     AND s.resultDistance = r.distance
     AND s.resultSeq = r.seq
  `

  const selectFilteredRecords = prepareStatement<
    Params & { id: string; userId: string },
    ResultsRowWithSession
  >(
    await getPool(),
    `
    SELECT r.*, s.id AS videoTimerSessionId
    ${baseJoin}
    WHERE r.swimmer = :id
      AND r.course = :course
      AND r.stroke = :stroke
      AND r.distance = :distance
      AND r.date > COALESCE(:startDate, '1970-01-01')
      AND r.date <= COALESCE(:endDate, CURDATE())
    ORDER BY r.date ASC
    `
  )

  const selectAllStrokeRecords = prepareStatement<
    Omit<Params, "stroke"> & { id: string; userId: string },
    ResultsRowWithSession
  >(
    await getPool(),
    `
    SELECT r.*, s.id AS videoTimerSessionId
    ${baseJoin}
    WHERE r.swimmer = :id
      AND r.course = :course
      AND r.distance = :distance
      AND r.date > COALESCE(:startDate, '1970-01-01')
      AND r.date <= COALESCE(:endDate, CURDATE())
    ORDER BY r.date ASC
    `
  )

  const selectAllRecords = prepareStatement<
    { id: string; userId: string },
    ResultsRowWithSession
  >(
    await getPool(),
    `
    SELECT r.*, s.id AS videoTimerSessionId
    ${baseJoin}
    WHERE r.swimmer = :id
    ORDER BY r.date ASC
    `
  )

  const query = getQuery<Params>( event )

  if ( Object.keys( query ).length ) {
    if ( !query.startDate ) query.startDate = null
    if ( !query.endDate ) query.endDate = null

    if ( query.stroke ) {
      return await selectFilteredRecords.all( { id, userId, ...query } )
    }

    const { stroke, ...q } = query
    return await selectAllStrokeRecords.all( { id, userId, ...q } )
  }

  return await selectAllRecords.all( { id, userId } )
} )