import { getGCClient, SubscriptionIntervalUnit } from "~~/server/utils/gocardless"
import { getPool, prepareStatement } from "lib"

interface PendingRecord {
  tier:     string
  amount:   number
  name:     string
  currency: string
}

export default defineEventHandler( async ( event ) => {
  const { user } = await validateRequest( event )
  if ( !user ) throw createError( { statusCode: 401, message: "Not authenticated" } )

  const { billingRequestId } = await readBody<{ billingRequestId: string }>( event )
  if ( !billingRequestId ) throw createError( { statusCode: 400, message: "billingRequestId required" } )

  const gc = getGCClient()

  // Get the billing request from GoCardless to verify it's fulfilled
  const billingRequest = await gc.billingRequests.find( billingRequestId )

  if ( billingRequest.status !== "fulfilled" ) {
    throw createError( {
      statusCode: 422,
      message: "Payment authorisation not yet complete. Please try again in a moment.",
    } )
  }

  const mandateId = billingRequest.links?.mandate_request_mandate
  if ( !mandateId ) throw createError( { statusCode: 422, message: "Mandate not found on billing request" } )

  // Retrieve the pending tier + its commercial details from DB in one join
  const pending = await prepareStatement<{ userId: string }, PendingRecord>(
    await getPool(),
    `SELECT us.tier, st.amount, st.name, st.currency
     FROM UserSubscription us
     JOIN SubscriptionTiers st ON st.id = us.tier
     WHERE us.userId = :userId LIMIT 1`
  ).get( { userId: user.id } )

  if ( !pending || pending.amount === 0 ) {
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

  // Persist the active subscription
  await prepareStatement<{ mandateId: string, subscriptionId: string, userId: string }>(
    await getPool(),
    `UPDATE UserSubscription
     SET gcMandateId = :mandateId, gcSubscriptionId = :subscriptionId, status = 'active'
     WHERE userId = :userId`
  ).run( { mandateId, subscriptionId: subscription.id, userId: user.id } )

  return { success: true, tier: pending.tier }
} )
