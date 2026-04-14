import type { SubscriptionTier } from "lib"

// Feature → which tiers can access it
const FEATURE_GATES = {
  results:          [ "parent", "trainer", "club-small", "club-large" ],
  compare:          [ "trainer", "club-small", "club-large" ],
  trainingTimes:    [ "club-small", "club-large" ],
  speedcharts:      [ "club-small", "club-large" ],
  meets:            [ "parent", "trainer", "club-small", "club-large" ],
  races:            [ "parent", "trainer", "club-small", "club-large" ],
  timer:            [ "trainer", "club-small", "club-large" ],
  videoTimer:       [ "trainer", "club-small", "club-large" ],
  qualifyingView:   [ "club-small", "club-large" ],
  qualifyingEdit:   [ "club-small", "club-large" ],
  qualifyingImport: [ "club-small", "club-large" ],
  selectClub:       [ "parent", "trainer", "club-small", "club-large" ],
  claimClub:        [ "club-small", "club-large" ],
  swimmerUpdates:   [ "parent", "trainer", "club-small", "club-large" ],
} as const

export type SubscriptionFeature = keyof typeof FEATURE_GATES

interface SubscriptionStatus {
  tier:             SubscriptionTier
  status:           string
  gcSubscriptionId: string | null
}

export const useSubscription = () => {
  const user = useUser()

  const { data, refresh } = useAsyncData<SubscriptionStatus>(
    "subscription",
    () => $fetch<SubscriptionStatus>( "/api/billing/status" ),
    { default: () => ( { tier: "free" as SubscriptionTier, status: "active", gcSubscriptionId: null } ) }
  )

  const isAdmin = computed( () => user.value?.role === "admin" )
  const tier = computed( () => data.value?.tier ?? "free" )
  const isActive = computed( () => data.value?.status === "active" )
  const isPaid = computed( () => tier.value !== "free" )

  const canAccess = ( feature: SubscriptionFeature ): boolean =>
    isAdmin.value || ( FEATURE_GATES[feature] as readonly string[] ).includes( tier.value )

  return { tier, isAdmin, isActive, isPaid, canAccess, refresh }
}
