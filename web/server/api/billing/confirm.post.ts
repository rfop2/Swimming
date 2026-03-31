import { getGCClient, TIER_AMOUNTS, TIER_NAMES, type PaidTier } from "~~/server/utils/gocardless"
import { getPool, prepareStatement } from "lib"
import { SubscriptionIntervalUnit } from "gocardless-nodejs/types/Types"

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

  // Retrieve the pending tier from our DB
  const getRecord = prepareStatement(
    await getPool(),
    "SELECT tier FROM UserSubscription WHERE userId = :userId LIMIT 1"
  )
  const record = await getRecord.get<{ tier: PaidTier }>( { userId: user.id } )
  const tier = record?.tier as PaidTier | undefined

  if ( !tier || !TIER_AMOUNTS[tier] ) {
    throw createError( { statusCode: 422, message: "No pending subscription found for this account" } )
  }

  // Create the GoCardless subscription against the mandate
  const subscription = await gc.subscriptions.create( {
    amount:        String( TIER_AMOUNTS[tier] ),
    currency:      "GBP",
    interval_unit: SubscriptionIntervalUnit.Monthly,
    name:          `Swim Racing – ${TIER_NAMES[tier]}`,
    metadata:      { user_id: user.id, tier },
    links:         { mandate: mandateId },
  } )

  // Persist the active subscription
  const update = prepareStatement(
    await getPool(),
    `UPDATE UserSubscription
     SET gcMandateId = :mandateId, gcSubscriptionId = :subscriptionId, status = 'active'
     WHERE userId = :userId`
  )
  await update.run( { mandateId, subscriptionId: subscription.id, userId: user.id } )

  return { success: true, tier }
} )
