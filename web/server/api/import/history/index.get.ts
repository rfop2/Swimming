import { getPool, prepareStatement, type RowDataPacket } from "lib"

interface ImportHistoryRow extends RowDataPacket {
  id: number
  filename: string
  layoutId: string | null
  layoutName: string | null
  year: number
  scope: string
  area: string
  type: string
  course: string
  qualifyingStart: string | null
  qualifyingEnd: string | null
  lastRaceDate: string | null
  importedByName: string
  status: "pending" | "completed" | "failed" | "rolled_back"
  totalCount: number
  insertedCount: number
  updatedCount: number
  errorMessage: string | null
  created: string
  completedAt: string | null
  rolledBackAt: string | null
  rolledBackByName: string | null
}

export default defineEventHandler( async event => {
  if ( !event.context.user || event.context.user.role !== "admin" ) {
    throw createError( { statusCode: 403, statusMessage: "Administrator access required" } )
  }

  const selectImports = prepareStatement<Record<string, never>, ImportHistoryRow>( await getPool(), `
    SELECT id, filename, layoutId, layoutName, year, scope, area, type, course,
      qualifyingStart, qualifyingEnd, lastRaceDate, importedByName, status,
      totalCount, insertedCount, updatedCount, errorMessage, created, completedAt,
      rolledBackAt, rolledBackByName
    FROM QualifyingImports
    ORDER BY created DESC, id DESC
    LIMIT 500
  ` )

  return selectImports.all()
} )
