import { getPool, runTransaction } from "lib"
import type { User } from "lucia"
import { sendEmail } from "~~/server/utils/email"

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
    let newUserId: string | undefined
    await runTransaction( await getPool(), async ( conn, data ) => {
      newUserId = await addUser( conn, data )
    }, userData )
    try {
      await sendEmail(
        userData,
      `${config.public.siteName}: Thank you for registering`,
      `<p>Welcome to ${config.public.siteName}. You can now log in and add swimmers to your account.</p>`,
      {
        label: `Login to ${config.public.siteName}`,
        url: `${config.public.siteUrl}/login`,
      }
      )
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
