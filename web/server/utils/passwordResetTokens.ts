import crypto from "node:crypto"
import { getPool, prepareStatement } from "lib"

export const createPasswordResetToken = async ( userId: string, expiresInMinutes: number ): Promise<string> => {
  const token = crypto.randomBytes( 32 ).toString( "hex" )

  const insertToken = prepareStatement<{ token: string, user_id: string, expiresInMinutes: number }>(
    await getPool(),
    "REPLACE INTO PasswordResetTokens (token, user_id, expires_at) VALUES (:token, :user_id, NOW() + INTERVAL :expiresInMinutes MINUTE)"
  )
  await insertToken.run( { token, user_id: userId, expiresInMinutes } )

  return token
}
