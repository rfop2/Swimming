import { getPool, prepareStatement } from "lib"
import type { QualifyingReportRecord } from "lib"

export default defineEventHandler( async ( event ) => {
  const { user } = await validateRequest( event )
  if ( !user || user.role !== "admin" ) {
    throw createError( { statusCode: 403, message: "Admin access required" } )
  }

  const selectReports = prepareStatement<Record<string, never>, QualifyingReportRecord>(
    await getPool(),
    "SELECT id, year, sources, generatedAt FROM QualifyingReports ORDER BY generatedAt DESC"
  )
  return await selectReports.all()
} )
