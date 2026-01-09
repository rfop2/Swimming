import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( {
      status: 401
    } )
  }

  const stroke = getRouterParam( event, "stroke" )
  if ( !stroke ) {
    throw createError( {
      message: "No stroke given",
      status: 400
    } )
  }

  const distance = getRouterParam( event, "distance" )
  if ( !distance ) {
    throw createError( {
      message: "No distance given",
      status: 400
    } )
  }

  const course = getRouterParam( event, "course" )
  if ( !course ) {
    throw createError( {
      message: "No course given",
      status: 400
    } )
  }

  const gender = getRouterParam( event, "gender" )
  if ( !gender ) {
    throw createError( {
      message: "No gender given",
      status: 400
    } )
  }

  const tableStroke = stroke.toLocaleLowerCase()
  const tableDistance = distance.replace( /m?$/, "m" )
  const tableCourse = course.toLocaleLowerCase()
  const tableGender = gender.toLocaleLowerCase() === "female" ? "female" : "male"
  const tableName = `SpeedChart-${tableStroke}-${tableDistance}-${tableGender}-${tableCourse}`

  const tableCheck = prepareStatement<{ tableName: string },{ tableExists: number }>(
    await getPool(),
    `SELECT EXISTS (
      SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = :tableName
    ) AS tableExists`
  )
  const tableCheckResult = await tableCheck.get( { tableName } )
  if ( !tableCheckResult || !Number( tableCheckResult.tableExists ) ) {
    setResponseStatus( event, 404, "No data found for selected event" )
    return []
  }

  const selectRecords = prepareStatement(
    await getPool(),
    `SELECT * FROM \`${tableName}\``
  )
  const tasks = await selectRecords.all()
  return tasks
} )
