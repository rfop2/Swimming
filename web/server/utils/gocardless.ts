import { GoCardlessClient } from "gocardless-nodejs/client"
import { Environments } from "gocardless-nodejs/constants"
import { SubscriptionIntervalUnit } from "gocardless-nodejs/types/Types"

export type PaidTier = "parent" | "trainer" | "club-small" | "club-large"
export type SubscriptionTier = "free" | PaidTier

export { SubscriptionIntervalUnit }

let _gc: GoCardlessClient | null = null

export const getGCClient = (): GoCardlessClient => {
  if ( !_gc ) {
    const token = process.env.GC_ACCESS_TOKEN
    if ( !token ) throw new Error( "GC_ACCESS_TOKEN is not set" )
    const env = process.env.GC_ENVIRONMENT === "live" ? Environments.Live : Environments.Sandbox
    _gc = new GoCardlessClient( token, env )
  }
  return _gc
}
