export {}

declare global {
  // Nuxt injects this at runtime
  const $fetch: typeof import( "ofetch" ).$fetch
}
