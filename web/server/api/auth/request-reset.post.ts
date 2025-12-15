import crypto from "node:crypto"
import { createError, readBody } from "h3"
import { getPool, prepareStatement } from "lib"
import { sendEmail } from "~~/server/utils/email"
import type { User } from "lucia"

export default defineEventHandler( async ( event ) => {
  const config = useRuntimeConfig()

  const { email } = await readBody<{ email: string }>( event )
  if ( !email ) throw createError( { statusCode: 400, message: "Email required" } )

  // Lookup user
  const getUser = prepareStatement<{ email: string }, User>( await getPool(), "SELECT * FROM User WHERE username = :email LIMIT 1" )
  const user = await getUser.get( { email } )
  if ( !user ) return { success: true } // don’t reveal account existence

  // Create token
  const token = crypto.randomBytes( 32 ).toString( "hex" )

  // Store token
  const insertToken = prepareStatement<{ token: string, user_id: string}>(
    await getPool(),
    "REPLACE INTO PasswordResetTokens (token, user_id, expires_at) VALUES (:token, :user_id, NOW() + INTERVAL 15 MINUTE)"
  )
  await insertToken.run( { token, user_id: user.id } )

  // Construct reset link
  const base = getRequestURL( event ).origin
  const link = `${base}/reset-password?token=${token}`

  await sendEmail(
    user,
    `${config.public.siteName}: Reset your password`,
    `<p>Click <a href="${link}">here</a> to reset your password (expires in 15 min).</p>`,
    {
      label: "Reset password",
      url: link,
    }
  )

  return { success: true }
} )
