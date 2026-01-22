import { Temporal } from "temporal-polyfill"

export default defineNuxtPlugin( () => {
  if ( !( "Temporal" in globalThis ) ) {
    globalThis.Temporal = Temporal
  }
} )
