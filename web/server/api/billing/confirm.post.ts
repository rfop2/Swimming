import { getGCClient, SubscriptionIntervalUnit } from "~~/server/utils/gocardless"
import { getPool, prepareStatement } from "lib"

interface PendingRecord {
  tier:                string
  amount:              number
  name:                string
  currency:            string
  gcBillingRequestId:  string
}

export default defineEventHandler( async ( event ) => {
  const { user } = await validateRequest( event )
  if ( !user ) throw createError( { statusCode: 401, message: "Not authenticated" } )

  const gc = getGCClient()

  // Retrieve the pending tier + billing request ID from DB in one join
  const pending = await prepareStatement<{ userId: string }, PendingRecord>(
    await getPool(),
    `SELECT us.tier, us.gcBillingRequestId, st.amount, st.name, st.currency
     FROM UserSubscription us
     JOIN SubscriptionTiers st ON st.id = us.tier
     WHERE us.userId = :userId LIMIT 1`
  ).get( { userId: user.id } )

  if ( !pending?.gcBillingRequestId ) {
    throw createError( { statusCode: 422, message: "No pending billing request found for this account" } )
  }

  // Get the billing request from GoCardless to verify it's fulfilled
  const billingRequest = await gc.billingRequests.find( pending.gcBillingRequestId )

  if ( billingRequest.status !== "fulfilled" ) {
    throw createError( {
      statusCode: 422,
      message: "Payment authorisation not yet complete. Please try again in a moment.",
    } )
  }

  const mandateId = billingRequest.links?.mandate_request_mandate
  if ( !mandateId ) throw createError( { statusCode: 422, message: "Mandate not found on billing request" } )

  if ( pending.amount === 0 ) {
    throw createError( { statusCode: 422, message: "No pending subscription found for this account" } )
  }

  // Create the GoCardless subscription against the mandate
  const subscription = await gc.subscriptions.create( {
    amount:        String( pending.amount ),
    currency:      pending.currency,
    interval_unit: SubscriptionIntervalUnit.Monthly,
    name:          `Swim Racing – ${pending.name}`,
    metadata:      { user_id: user.id, tier: pending.tier },
    links:         { mandate: mandateId },
  } )

  // Persist the active subscription, setting currentPeriodEnd to 1 month from now
  const periodEnd = new Date()
  periodEnd.setMonth( periodEnd.getMonth() + 1 )

  await prepareStatement<{ mandateId: string, subscriptionId: string, periodEnd: Date, userId: string }>(
    await getPool(),
    `UPDATE UserSubscription
     SET gcMandateId = :mandateId, gcSubscriptionId = :subscriptionId,
         status = 'active', currentPeriodEnd = :periodEnd
     WHERE userId = :userId`
  ).run( { mandateId, subscriptionId: subscription.id, periodEnd, userId: user.id } )

  return { success: true, tier: pending.tier }
} )
