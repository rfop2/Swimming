// server/api/email.post.ts
import { defineEventHandler, readBody } from "h3"
import fetch from "node-fetch"

interface TokenResponse {
  token_type: string
  expires_in: number
  ext_expires_in: number
  access_token: string
}

export default defineEventHandler( async ( event ) => {
  const { to, subject, body } = await readBody( event )

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams( {
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      } ),
    }
  )

  const response = ( await tokenResponse.json() ) as TokenResponse
  console.log( "r", response )
  const { access_token } = response

  const graphRes = await fetch(
    "https://graph.microsoft.com/v1.0/users/contact@swim.racing/sendMail",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify( {
        message: {
          subject,
          body: { contentType: "HTML", content: body },
          toRecipients: [ { emailAddress: { address: to } } ],
        },
      } ),
    }
  )
  console.log( "gr", graphRes )

  if ( !graphRes.ok ) {
    throw createError( {
      status: 500,
      message: `Email send failed: ${await graphRes.text()}`,
    } )
  }
  return { success: true }
} )
