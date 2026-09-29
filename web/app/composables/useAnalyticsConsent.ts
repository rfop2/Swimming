type AnalyticsConsent = "granted" | "denied"

export const useAnalyticsConsent = () => {
  const config = useRuntimeConfig()
  const { initialize, disableAnalytics, enableAnalytics } = useGtag()

  // Analytics is only active when a tag ID has been configured
  const enabled = computed( () => !!config.public.gtag?.id )

  const consent = useCookie<AnalyticsConsent | null>( "analytics_consent", {
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    default: () => null,
  } )

  const needsDecision = computed( () => enabled.value && consent.value === null )

  const accept = () => {
    consent.value = "granted"
    enableAnalytics()
    initialize()
  }

  const decline = () => {
    consent.value = "denied"
    disableAnalytics()
  }

  // Clears the stored choice so the banner is shown again
  const reset = () => {
    consent.value = null
  }

  return { enabled, consent, needsDecision, accept, decline, reset }
}
