import { getPool, prepareStatement } from "lib"

export interface ShareLinkRow {
  token: string
  swimmerId: string
  createdBy: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { status: 401 } )
  }

  const swimmerId = getQuery( event ).swimmerId as string | undefined
  if ( !swimmerId ) {
    throw createError( { status: 400, message: "swimmerId is required" } )
  }

  const userId = event.context.user.id
  const pool = await getPool()

  const checkOwnership = prepareStatement<{ userId: string, swimmerId: string }, { swimmerId: string }>(
    pool,
    "SELECT swimmerId FROM UserSwimmers WHERE userId = :userId AND swimmerId = :swimmerId"
  )
  const ownership = await checkOwnership.get( { userId, swimmerId } )
  if ( !ownership ) {
    throw createError( { status: 403, message: "Swimmer not found" } )
  }

  const selectLinks = prepareStatement<{ swimmerId: string }, ShareLinkRow>(
    pool,
    "SELECT token, swimmerId, createdBy, createdAt, expiresAt, revokedAt FROM ShareLinks WHERE swimmerId = :swimmerId AND revokedAt IS NULL AND expiresAt > NOW() ORDER BY createdAt DESC"
  )
  return selectLinks.all( { swimmerId } )
} )
