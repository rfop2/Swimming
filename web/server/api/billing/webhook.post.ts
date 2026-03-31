import { parse } from "gocardless-nodejs/webhooks"
import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  const secret = process.env.GC_WEBHOOK_SECRET
  if ( !secret ) throw createError( { statusCode: 500, message: "Webhook secret not configured" } )

  const signature = getHeader( event, "webhook-signature" ) ?? ""
  const rawBody = await readRawBody( event )
  if ( !rawBody ) throw createError( { statusCode: 400, message: "Empty body" } )

  let events
  try {
    events = parse( rawBody, secret, signature )
  } catch {
    throw createError( { statusCode: 498, message: "Invalid webhook signature" } )
  }

  for ( const ev of events ) {
    const resourceType = ev.resource_type // "subscriptions" | "mandates" | "payments" etc.
    const action = ev.action             // "cancelled" | "failed" | "paid_out" etc.

    if (
      ( resourceType === "subscriptions" && action === "cancelled" ) ||
      ( resourceType === "mandates"      && action === "cancelled" )
    ) {
      // Find subscription by GC ID and downgrade to free
      const idField = resourceType === "subscriptions" ? "gcSubscriptionId" : "gcMandateId"
      const gcId: string = ( ev.links as Record<string, string> )[
        resourceType === "subscriptions" ? "subscription" : "mandate"
      ]

      if ( gcId ) {
        const update = prepareStatement(
          await getPool(),
          `UPDATE UserSubscription SET status = 'cancelled', tier = 'free'
           WHERE ${idField} = :gcId`
        )
        await update.run( { gcId } )
      }
    }
  }

  return { success: true }
} )
