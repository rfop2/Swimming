import { createError, readBody } from "h3"
import type { User } from "lucia"
import { sendEmail } from "~~/server/utils/email"
import { checkRateLimit } from "~~/server/utils/rateLimiter"

interface ContactSubmission {
  firstName: string
  lastName: string
  username: string
  phone: string
  role: string
  club?: string
  message?: string
  captcha?: string
}

const ROLE_LABELS: Record<string, string> = {
  "swimmer": "Swimmer",
  "trainer": "Trainer",
  "parent": "Parent",
  "club-admin": "Club Administrator",
  "other": "Other",
}

export default defineEventHandler( async ( event ) => {
  const ip = getRequestIP( event, { xForwardedFor: true } ) ?? "unknown"
  const { allowed, retryAfter } = checkRateLimit( `contact:${ip}`, 5, 60 * 60 * 1000 )
  if ( !allowed ) {
    setHeader( event, "Retry-After", retryAfter ?? 0 )
    throw createError( { statusCode: 429, message: "Too many enquiries submitted. Please try again later." } )
  }

  const config = useRuntimeConfig()
  const body = await readBody<ContactSubmission>( event )

  if ( !body.firstName || !body.lastName || !body.username || !body.phone || !body.role ) {
    throw createError( { statusCode: 400, message: "Please complete all required fields" } )
  }

  if ( !( event.context.session && event.context.user ) ) {
    if ( !body.captcha ) {
      throw createError( { statusCode: 400, message: "Captcha is required" } )
    }
    const verify = await verifyTurnstileToken( body.captcha )
    if ( !verify.success ) {
      throw createError( { statusCode: 400, message: "Captcha failed" } )
    }
  }

  await sendEmail(
    {
      username: config.adminEmail,
      firstName: "System",
      lastName: "Admin",
    } as User,
    `${config.public.siteName}: Contact form submission`,
    `
      <p>A new enquiry has been submitted via the ${config.public.siteName} contact form.</p>
      <p>
        <strong>Name:</strong> ${body.firstName} ${body.lastName}<br>
        <strong>Email:</strong> ${body.username}<br>
        <strong>Phone:</strong> ${body.phone}<br>
        <strong>Enquiring as:</strong> ${ROLE_LABELS[body.role] ?? body.role}<br>
        ${body.club ? `<strong>Club:</strong> ${body.club}<br>` : ""}
      </p>
      ${body.message ? `<p><strong>Message:</strong><br>${body.message.replace( /\n/g, "<br>" )}</p>` : ""}
    `
  )

  return { success: true }
} )
