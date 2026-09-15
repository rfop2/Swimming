import { geocodeLocation, getPool, runTransaction } from "lib"
import type { User } from "lucia"
import { sendEmail } from "~~/server/utils/email"
import { createPasswordResetToken } from "~~/server/utils/passwordResetTokens"

export default defineEventHandler( async ( event ) => {
  const config = useRuntimeConfig()
  try {
    const userData = await readBody( event )

    const userId = getRouterParam( event, "id" )
    if ( !userId ) {
      throw createError( {
        message: "No user id found",
        status: 400
      } )
    }
    if ( event.context.session && event.context.user ) {
      if ( userId !== event.context.user.id && event.context.user.role !== "admin" ) {
        throw createError( {
          status: 403
        } )
      }
    } else if ( userData.captcha ) {
      const verify = await verifyTurnstileToken( userData.captcha )

      console.log( "v", verify )

      if ( !verify.success ) {
        console.error( "Turnstile verification failed:", verify["error-codes"] )

        throw createError( {
          statusCode: 400,
          statusMessage: "Captcha failed",
        } )
      }
      /* throw createError( {
        status: 400,
        statusMessage: "Captcha missing"
      } ) */
    } else {
      throw createError( {
        status: 401
      } )
    }
    const isAdminCreating = event.context.user?.role === "admin"

    // Attribute flags (county/regional admin, etc.) can only be set by an admin creating the account.
    if ( !isAdminCreating ) {
      delete userData.attributes
    }

    // Self-registration always needs a password; an admin may instead leave it blank
    // and have the new user set their own via an emailed link (see below).
    if ( !isAdminCreating && ( !userData.password || !userData.confirmPassword ) ) {
      throw createError( {
        message: "Password is required",
        status: 400
      } )
    }

    if ( userData.location ) {
      const geocoded = await geocodeLocation( userData.location )
      if ( geocoded ) {
        userData.locationId = geocoded.locationId
      }
    }

    let newUserId: string | undefined
    await runTransaction( await getPool(), async ( conn, data ) => {
      newUserId = await addUser( conn, data )
    }, userData )
    try {
      if ( userData.password ) {
        await sendEmail(
          userData,
        `${config.public.siteName}: Thank you for registering`,
        `<p>Welcome to ${config.public.siteName}. You can now log in and add swimmers to your account.</p>`,
        {
          label: `Login to ${config.public.siteName}`,
          url: `${config.public.siteUrl}/login`,
        }
        )
      } else if ( newUserId ) {
        // Pending setup - email the new user a link to choose their own password.
        const token = await createPasswordResetToken( newUserId, 7 * 24 * 60 )
        const link = `${getRequestURL( event ).origin}/reset-password?token=${token}`
        await sendEmail(
          userData,
        `${config.public.siteName}: Set up your account`,
        `<p>An account has been created for you on ${config.public.siteName}. Click below to set your password and complete your account setup (link expires in 7 days).</p>`,
        {
          label: "Set up your account",
          url: link,
        }
        )
      }
    } catch ( e ) {
      console.log( "Unable to send user confirmation email", e )
    }
    try {
      await sendEmail(
      {
        username: config.adminEmail,
        firstName: "System",
        lastName: "Admin"
      } as User,
      `${config.public.siteName}: New Registration`,
      `<p>A new registration has been made on the ${config.public.siteName} website.</p>
      <p>User ${userData.firstName} ${userData.lastName} (${userData.username}) has just registered on the site.</p>`,
      {
        label: "View Users",
        url: `${config.public.siteUrl}/users`,
      }
      )
    } catch ( e ) {
      console.log( "Unable to send admin notification email", e )
    }

    return { id: newUserId }
  } catch ( error ) {
    console.error( error )
    throw error
    /* throw createError( {
      message: "Unable to create user record",
      status: 500
    } ) */
  }
} )
