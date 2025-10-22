export default defineNuxtPlugin( async () => {
  if ( !( "Temporal" in globalThis ) ) {
    const { Temporal } = await import( "temporal-polyfill" )
    // Attach polyfill globally
    globalThis.Temporal = Temporal
  }
} )
