import { getPool, isMySql2Error, prepareStatement } from "lib"
import { randomUUID } from "crypto"

interface ShareLinkRow {
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

  const body = await readBody<{ swimmerId: string, expiresAt?: string }>( event )
  const { swimmerId, expiresAt: expiresAtStr } = body ?? {}

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

  const token = randomUUID()
  const expiresAt = expiresAtStr
    ? new Date( expiresAtStr )
    : new Date( Date.now() + 30 * 24 * 60 * 60 * 1000 )
  const expiresAtMysql = expiresAt.toISOString().slice( 0, 19 ).replace( "T", " " )

  try {
    const insertLink = prepareStatement(
      pool,
      "INSERT INTO ShareLinks (token, swimmerId, createdBy, expiresAt) VALUES (:token, :swimmerId, :createdBy, :expiresAt)"
    )
    await insertLink.run( { token, swimmerId, createdBy: userId, expiresAt: expiresAtMysql } )
  } catch ( error ) {
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }
    throw error
  }

  return { token, swimmerId, expiresAt: expiresAt.toISOString() } as Pick<ShareLinkRow, "token" | "swimmerId"> & { expiresAt: string }
} )
