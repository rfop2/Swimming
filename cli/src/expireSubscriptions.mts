#!/usr/bin/env node
import "dotenv/config"
import * as Sentry from "@sentry/node"

Sentry.init( {
  dsn: "https://95f3d66ca3d941509f3dacbbf8b478fc@o149151.ingest.us.sentry.io/4511064670011392",
  tracesSampleRate: 1.0,
} )

import { closePool, getPool, prepareStatement } from "lib"

async function main() {
  const pool = await getPool()

  // Find all active subscriptions whose period has lapsed
  const expired = await prepareStatement<Record<string, never>, { userId: string, tier: string }>(
    pool,
    `SELECT userId, tier FROM UserSubscription
     WHERE status = 'active'
       AND currentPeriodEnd IS NOT NULL
       AND currentPeriodEnd < DATE_SUB( NOW(), INTERVAL 7 DAY )`
  ).all()

  if ( !expired.length ) {
    console.log( "No expired subscriptions found." )
    return
  }

  for ( const row of expired ) {
    await prepareStatement<{ userId: string }>(
      pool,
      `UPDATE UserSubscription
       SET status = 'failed', tier = 'free'
       WHERE userId = :userId`
    ).run( { userId: row.userId } )

    console.log( `Expired subscription for user ${row.userId} (was ${row.tier})` )
  }

  console.log( `Processed ${expired.length} expired subscription(s).` )
}

( async () => {
  await main()
} )().catch( async ( error ) => {
  console.error( "Uncaught error...", error )
  Sentry.captureException( error )
  process.exitCode = 1
} ).finally( async () => {
  await Sentry.flush( 2000 )
  try { await closePool() } catch { void 0 }
} )
