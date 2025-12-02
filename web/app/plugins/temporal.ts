import { Temporal } from "@js-temporal/polyfill"

export default defineNuxtPlugin( () => {
  if ( !( "Temporal" in globalThis ) ) {
    globalThis.Temporal = Temporal
  }
} )
