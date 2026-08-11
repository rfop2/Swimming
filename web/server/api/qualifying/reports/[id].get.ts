import { setHeader } from "h3"
import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  const { user } = await validateRequest( event )
  if ( !user || user.role !== "admin" ) {
    throw createError( { statusCode: 403, message: "Admin access required" } )
  }

  const id = getRouterParam( event, "id" )
  if ( !id || !/^\d+$/.test( id ) ) {
    throw createError( { statusCode: 400, message: "Invalid report id" } )
  }

  const selectReport = prepareStatement<{ id: string }, { html: string }>(
    await getPool(),
    "SELECT html FROM QualifyingReports WHERE id = :id"
  )
  const report = await selectReport.get( { id } )
  if ( !report ) {
    throw createError( { statusCode: 404, message: "Report not found" } )
  }

  setHeader( event, "Content-Type", "text/html; charset=utf-8" )
  return report.html
} )
