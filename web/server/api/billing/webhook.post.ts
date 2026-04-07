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
    const resourceType = ev.resource_type
    const action = ev.action
    const links = ev.links as Record<string, string>

    if (
      ( resourceType === "subscriptions" && action === "cancelled" ) ||
      ( resourceType === "mandates"      && action === "cancelled" )
    ) {
      const idField = resourceType === "subscriptions" ? "gcSubscriptionId" : "gcMandateId"
      const gcId = links[ resourceType === "subscriptions" ? "subscription" : "mandate" ]

      if ( gcId ) {
        await prepareStatement(
          await getPool(),
          `UPDATE UserSubscription SET status = 'cancelled', tier = 'free'
           WHERE ${idField} = :gcId`
        ).run( { gcId } )
      }
    }

    if ( resourceType === "payments" && action === "confirmed" ) {
      // A payment has cleared — extend the current period by 1 month
      const gcSubscriptionId = links["subscription"]
      if ( gcSubscriptionId ) {
        const periodEnd = new Date()
        periodEnd.setMonth( periodEnd.getMonth() + 1 )

        await prepareStatement<{ periodEnd: Date, gcSubscriptionId: string }>(
          await getPool(),
          `UPDATE UserSubscription
           SET currentPeriodEnd = :periodEnd, status = 'active'
           WHERE gcSubscriptionId = :gcSubscriptionId`
        ).run( { periodEnd, gcSubscriptionId } )
      }
    }
  }

  return { success: true }
} )
