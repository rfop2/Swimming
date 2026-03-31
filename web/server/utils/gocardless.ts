import { GoCardlessClient } from "gocardless-nodejs/client"
import { Environments } from "gocardless-nodejs/constants"
import { SubscriptionIntervalUnit } from "gocardless-nodejs/types/Types"

export const VALID_TIERS = [ "parent", "trainer", "club-small", "club-large" ] as const
export type PaidTier = typeof VALID_TIERS[number]
export type SubscriptionTier = "free" | PaidTier

export const TIER_AMOUNTS: Record<PaidTier, number> = {
  "parent":     600,
  "trainer":    1200,
  "club-small": 2500,
  "club-large": 3500,
}

export const TIER_NAMES: Record<SubscriptionTier, string> = {
  "free":       "Free",
  "parent":     "Parent Tier",
  "trainer":    "Trainer Tier",
  "club-small": "Club Tier (small)",
  "club-large": "Club Tier (large)",
}

export { SubscriptionIntervalUnit }

let _gc: GoCardlessClient | null = null

export function getGCClient(): GoCardlessClient {
  if ( !_gc ) {
    const token = process.env.GC_ACCESS_TOKEN
    if ( !token ) throw new Error( "GC_ACCESS_TOKEN is not set" )
    const env = process.env.GC_ENVIRONMENT === "live" ? Environments.Live : Environments.Sandbox
    _gc = new GoCardlessClient( token, env )
  }
  return _gc
}
