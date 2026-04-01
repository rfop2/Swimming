import { getPool, prepareStatement } from "lib"

interface GrantSubscriptionBody {
  userId:   string
  tier:     string
  months:   number
}

export default defineEventHandler( async ( event ) => {
  const { user } = await validateRequest( event )
  if ( !user || !Number( user.admin ) ) {
    throw createError( { statusCode: 403, message: "Admin access required" } )
  }

  const body = await readBody<GrantSubscriptionBody>( event )
  if ( !body.userId || !body.tier || !body.months ) {
    throw createError( { statusCode: 400, message: "userId, tier and months are required" } )
  }

  const pool = await getPool()

  // Verify tier exists
  const tierRow = await prepareStatement<{ id: string }>(
    pool,
    "SELECT id FROM SubscriptionTiers WHERE id = :id AND active = 1"
  ).get( { id: body.tier } )

  if ( !tierRow ) {
    throw createError( { statusCode: 400, message: "Invalid tier" } )
  }

  // Extend from the current period end if it's in the future, otherwise extend from now
  const existing = await prepareStatement<{ userId: string }, { currentPeriodEnd: string | null }>(
    pool,
    "SELECT currentPeriodEnd FROM UserSubscription WHERE userId = :userId"
  ).get( { userId: body.userId } )

  const base = existing?.currentPeriodEnd && new Date( existing.currentPeriodEnd ) > new Date()
    ? new Date( existing.currentPeriodEnd )
    : new Date()

  const periodEnd = new Date( base )
  periodEnd.setMonth( periodEnd.getMonth() + body.months )

  // Upsert the subscription record
  await prepareStatement<{ userId: string, tier: string, periodEnd: Date }>(
    pool,
    `INSERT INTO UserSubscription (userId, tier, status, source, currentPeriodEnd)
     VALUES (:userId, :tier, 'active', 'manual', :periodEnd)
     ON DUPLICATE KEY UPDATE
       tier = :tier,
       status = 'active',
       source = 'manual',
       currentPeriodEnd = :periodEnd,
       gcSubscriptionId = NULL,
       gcMandateId = NULL,
       gcBillingRequestId = NULL`
  ).run( { userId: body.userId, tier: body.tier, periodEnd } )

  return { success: true }
} )
