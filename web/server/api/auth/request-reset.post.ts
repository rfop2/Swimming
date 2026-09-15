import { createError, readBody } from "h3"
import { getPool, prepareStatement } from "lib"
import { sendEmail } from "~~/server/utils/email"
import type { User } from "lucia"
import { checkRateLimit } from "~~/server/utils/rateLimiter"
import { createPasswordResetToken } from "~~/server/utils/passwordResetTokens"

export default defineEventHandler( async ( event ) => {
  const ip = getRequestIP( event, { xForwardedFor: true } ) ?? "unknown"
  const { allowed, retryAfter } = checkRateLimit( `reset:${ip}`, 5, 60 * 60 * 1000 )
  if ( !allowed ) {
    setHeader( event, "Retry-After", retryAfter ?? 0 )
    throw createError( { statusCode: 429, message: "Too many reset requests. Please try again later." } )
  }

  const config = useRuntimeConfig()

  const { email } = await readBody<{ email: string }>( event )
  if ( !email ) throw createError( { statusCode: 400, message: "Email required" } )

  // Lookup user
  const getUser = prepareStatement<{ email: string }, User>( await getPool(), "SELECT * FROM User WHERE username = :email LIMIT 1" )
  const user = await getUser.get( { email } )
  if ( !user ) return { success: true } // don’t reveal account existence

  // Create token
  const token = await createPasswordResetToken( user.id, 15 )

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
