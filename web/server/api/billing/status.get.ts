import { getPool, prepareStatement } from "lib"
import type { SubscriptionTier } from "lib"

interface SubscriptionRow {
  tier:             SubscriptionTier
  status:           string
  gcSubscriptionId: string | null
}

export default defineEventHandler( async ( event ) => {
  const { user } = await validateRequest( event )
  if ( !user ) throw createError( { statusCode: 401, message: "Not authenticated" } )

  const getRecord = prepareStatement(
    await getPool(),
    "SELECT tier, status, gcSubscriptionId FROM UserSubscription WHERE userId = :userId LIMIT 1"
  )
  const record = await getRecord.get<SubscriptionRow>( { userId: user.id } )

  // No row or non-active status → free tier
  if ( !record || record.status !== "active" ) {
    return { tier: "free" as SubscriptionTier, status: "active", gcSubscriptionId: null }
  }

  return {
    tier:             record.tier,
    status:           record.status,
    gcSubscriptionId: record.gcSubscriptionId,
  }
} )
