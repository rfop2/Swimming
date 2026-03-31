import { getGCClient, VALID_TIERS, TIER_NAMES, type PaidTier } from "~~/server/utils/gocardless"
import { getPool, prepareStatement } from "lib"
import { SubscriptionIntervalUnit } from "gocardless-nodejs/types/Types"

export default defineEventHandler( async ( event ) => {
  const { user } = await validateRequest( event )
  if ( !user ) throw createError( { statusCode: 401, message: "Not authenticated" } )

  const { tier } = await readBody<{ tier: string }>( event )
  if ( !VALID_TIERS.includes( tier as PaidTier ) ) {
    throw createError( { statusCode: 400, message: "Invalid tier" } )
  }

  const gc = getGCClient()
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl as string

  // Look up or create a GC customer for this user
  const getExisting = prepareStatement(
    await getPool(),
    "SELECT gcCustomerId FROM UserSubscription WHERE userId = :userId LIMIT 1"
  )
  const existing = await getExisting.get<{ gcCustomerId: string | null }>( { userId: user.id } )

  let customerId: string | undefined = existing?.gcCustomerId ?? undefined

  if ( !customerId ) {
    const customer = await gc.customers.create( {
      email:       user.username,
      given_name:  user.firstName,
      family_name: user.lastName,
    } )
    customerId = customer.id
  }

  // Create billing request (mandate + subscription in one flow)
  const billingRequest = await gc.billingRequests.create( {
    mandate_request: {
      currency: "GBP",
      scheme:   "bacs",
      metadata: { tier, user_id: user.id },
    },
    links: { customer: customerId },
  } )

  // Store pending record so we know the tier when the user returns
  const upsert = prepareStatement(
    await getPool(),
    `INSERT INTO UserSubscription (userId, gcCustomerId, tier, status)
     VALUES (:userId, :gcCustomerId, :tier, 'pending')
     ON DUPLICATE KEY UPDATE gcCustomerId = :gcCustomerId, tier = :tier, status = 'pending'`
  )
  await upsert.run( { userId: user.id, gcCustomerId: customerId, tier } )

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
