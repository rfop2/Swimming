import { hash } from "@node-rs/argon2"
import { readBody, createError } from "h3"
import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  const { token, newPassword } = await readBody<{ token: string; newPassword: string }>( event )
  if ( !token || !newPassword )
    throw createError( { statusCode: 400, message: "Missing token or password" } )

  // Lookup token record
  const stmt = prepareStatement<{ token: string }>(
    await getPool(),
    "SELECT user_id, expires_at, used FROM PasswordResetTokens WHERE token = :token"
  )
  const record = await stmt.get( { token } )

  if ( !record || record.used || new Date( record.expires_at ) < new Date() )
    throw createError( { statusCode: 400, message: "Invalid or expired token" } )

  // Hash new password
  const passwordHash = await hash( newPassword, {
    // recommended minimum parameters
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  } )

  // Update password via Lucia
  const updatePassword = prepareStatement<{ passwordHash: string, userId: string }>(
    await getPool(),
    "UPDATE User SET password_hash = :passwordHash WHERE id = :userId"
  )
  await updatePassword.run( { passwordHash, userId: record.user_id } )

  // Mark token as used
  const update = prepareStatement<{ token: string }>(
    await getPool(),
    "UPDATE PasswordResetTokens SET used = 1 WHERE token = :token"
  )
  await update.run( { token } )

  // Invalidate all sessions (recommended)
  await lucia.invalidateUserSessions( record.user_id )

  return { success: true }
} )
