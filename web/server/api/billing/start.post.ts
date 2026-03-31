import { getGCClient } from "~~/server/utils/gocardless"
import { getPool, prepareStatement } from "lib"

interface TierRecord {
  id:       string
  amount:   number
  currency: string
}

export default defineEventHandler( async ( event ) => {
  const { user } = await validateRequest( event )
  if ( !user ) throw createError( { statusCode: 401, message: "Not authenticated" } )

  const { tier } = await readBody<{ tier: string }>( event )

  // Validate tier against DB — rejects unknown IDs and the free tier (amount = 0)
  const tierRecord = await prepareStatement<{ tier: string }, TierRecord>(
    await getPool(),
    "SELECT id, amount, currency FROM SubscriptionTiers WHERE id = :tier AND active = 1 AND amount > 0 LIMIT 1"
  ).get( { tier } )

  if ( !tierRecord ) {
    throw createError( { statusCode: 400, message: "Invalid tier" } )
  }

  const gc = getGCClient()
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl as string

  // Look up or create a GC customer for this user
  const existing = await prepareStatement<{ userId: string }, { gcCustomerId: string | null }>(
    await getPool(),
    "SELECT gcCustomerId FROM UserSubscription WHERE userId = :userId LIMIT 1"
  ).get( { userId: user.id } )

  let customerId: string | undefined = existing?.gcCustomerId ?? undefined

  if ( !customerId ) {
    const customer = await gc.customers.create( {
      email:       user.username,
      given_name:  user.firstName,
      family_name: user.lastName,
    } )
    customerId = customer.id
  }

  // Create billing request (mandate only — subscription is created on confirm)
  const billingRequest = await gc.billingRequests.create( {
    mandate_request: {
      currency: tierRecord.currency,
      scheme:   "bacs",
      metadata: { tier: tierRecord.id, user_id: user.id },
    },
    links: { customer: customerId },
  } )

  // Store pending record so we know the tier when the user returns
  await prepareStatement<{ userId: string, gcCustomerId: string, tier: string }>(
    await getPool(),
    `INSERT INTO UserSubscription (userId, gcCustomerId, tier, status)
     VALUES (:userId, :gcCustomerId, :tier, 'pending')
     ON DUPLICATE KEY UPDATE gcCustomerId = :gcCustomerId, tier = :tier, status = 'pending'`
  ).run( { userId: user.id, gcCustomerId: customerId, tier: tierRecord.id } )

  // Create the hosted flow the user will be redirected to
  const flow = await gc.billingRequestFlows.create( {
    links:              { billing_request: billingRequest.id },
    redirect_uri:       `${siteUrl}/billing/complete`,
    exit_uri:           `${siteUrl}/pricing`,
    prefilled_customer: {
      email:       user.username,
      given_name:  user.firstName,
      family_name: user.lastName,
    },
  } )

  return { url: flow.authorisation_url }
} )
