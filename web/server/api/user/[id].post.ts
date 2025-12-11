import { getPool, runTransaction } from "lib"

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

export default defineEventHandler( async ( event ) => {
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
      if ( userId !== event.context.user.id && !Number( event.context.user.admin ) ) {
        throw createError( {
          status: 403
        } )
      }
    } else if ( userData.captcha ) {
      // Verify with Cloudflare
      console.log( "T", JSON.stringify( process.env.TURNSTILE_SITE_KEY ), JSON.stringify( process.env.TURNSTILE_SECRET_KEY ), userData.captcha, getRequestIP( event ) ?? "" )
      const params = new URLSearchParams( {
        secret: process.env.TURNSTILE_SECRET_KEY!,
        response: userData.captcha,
        // remoteip: getRequestIP(event) ?? ""
      } )

      const response = await fetch( "https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: params,
        /* body: new URLSearchParams( {
          secret: process.env.TURNSTILE_SECRET_KEY!,
          response: userData.captcha,
          remoteip: getRequestIP( event ) ?? "", // optional, helps with fraud scoring
        } ), */
      } )
      console.log( "r", response )
      const verify: TurnstileVerifyResponse = await response.json()
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
    await runTransaction( await getPool(), addUser, userData )
  } catch ( error ) {
    console.error( error )
    throw error
    /* throw createError( {
      message: "Unable to create user record",
      status: 500
    } ) */
  }
} )
