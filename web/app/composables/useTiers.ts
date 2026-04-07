export interface TierInfo {
  id:          string
  name:        string
  description: string
  amount:      number   // pence
  currency:    string
  featured:    number   // 1 = show "Most popular" badge
  sortOrder:   number
}

export const useTiers = () => {
  const { data: tiers } = useAsyncData<TierInfo[]>(
    "tiers",
    () => $fetch( "/api/billing/tiers" ),
    { default: () => [] }
  )

  const getTier = ( id: string ) => tiers.value?.find( t => t.id === id )

  const formatPrice = ( tier: TierInfo ) =>
    tier.amount === 0 ? "£0" : `£${tier.amount / 100}`

  return { tiers, getTier, formatPrice }
}
