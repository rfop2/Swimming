import { getPool, prepareStatement } from "lib"

interface ShareLinkRow {
  swimmerId: string
}

export const validateShareToken = async ( token: string ): Promise<string> => {
  const pool = await getPool()
  const selectLink = prepareStatement<{ token: string }, ShareLinkRow>(
    pool,
    "SELECT swimmerId FROM ShareLinks WHERE token = :token AND revokedAt IS NULL AND expiresAt > NOW()"
  )
  const link = await selectLink.get( { token } )
  if ( !link ) {
    throw createError( { status: 404, message: "Share link not found or expired" } )
  }
  return link.swimmerId
}
