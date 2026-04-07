import { getPool, prepareStatement } from "lib"

export interface TierRow {
  id:          string
  name:        string
  description: string
  amount:      number
  currency:    string
  featured:    number
  sortOrder:   number
}

// Public endpoint — no auth required
export default defineEventHandler( async () => {
  const tiers = await prepareStatement<Record<string, never>, TierRow>(
    await getPool(),
    "SELECT id, name, description, amount, currency, featured, sortOrder FROM SubscriptionTiers WHERE active = 1 ORDER BY sortOrder"
  ).all()

  return tiers
} )
