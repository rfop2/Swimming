import { getGCClient } from "~~/server/utils/gocardless"
import { getPool, prepareStatement } from "lib"

export default defineEventHandler( async ( event ) => {
  const { user } = await validateRequest( event )
  if ( !user ) throw createError( { statusCode: 401, message: "Not authenticated" } )

  const getRecord = prepareStatement(
    await getPool(),
    "SELECT gcSubscriptionId FROM UserSubscription WHERE userId = :userId AND status = 'active' LIMIT 1"
  )
  const record = await getRecord.get<{ gcSubscriptionId: string | null }>( { userId: user.id } )

  if ( !record?.gcSubscriptionId ) {
    throw createError( { statusCode: 404, message: "No active subscription found" } )
  }

  const gc = getGCClient()
  await gc.subscriptions.cancel( record.gcSubscriptionId, {} )

  const update = prepareStatement(
    await getPool(),
    "UPDATE UserSubscription SET status = 'cancelled', tier = 'free' WHERE userId = :userId"
  )
  await update.run( { userId: user.id } )

  return { success: true }
} )
