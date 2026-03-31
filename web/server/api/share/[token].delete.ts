import { getPool, isMySql2Error, prepareStatement } from "lib"

interface ShareLinkRow {
  token: string
  createdBy: string
}

export default defineEventHandler( async ( event ) => {
  if ( !event.context.session || !event.context.user ) {
    throw createError( { status: 401 } )
  }

  const token = getRouterParam( event, "token" )
  if ( !token ) {
    throw createError( { status: 400, message: "token is required" } )
  }

  const userId = event.context.user.id
  const isAdmin = Number( event.context.user.admin )
  const pool = await getPool()

  const selectLink = prepareStatement<{ token: string }, ShareLinkRow>(
    pool,
    "SELECT token, createdBy FROM ShareLinks WHERE token = :token"
  )
  const link = await selectLink.get( { token } )
  if ( !link ) {
    throw createError( { status: 404 } )
  }
  if ( link.createdBy !== userId && !isAdmin ) {
    throw createError( { status: 403 } )
  }

  try {
    const revokeLink = prepareStatement(
      pool,
      "UPDATE ShareLinks SET revokedAt = NOW() WHERE token = :token"
    )
    await revokeLink.run( { token } )
  } catch ( error ) {
    if ( isMySql2Error( error ) ) {
      throw createError( { status: 500, message: `Database error: ${error.sqlMessage}` } )
    }
    throw error
  }

  return { success: true }
} )
