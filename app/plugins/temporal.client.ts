export default defineNuxtPlugin( async () => {
  if ( !( "Temporal" in globalThis ) ) {
    const { Temporal } = await import( "@js-temporal/polyfill" )
    // Attach polyfill globally
    globalThis.Temporal = Temporal
  }
} )
