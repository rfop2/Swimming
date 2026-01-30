import { Temporal } from "temporal-polyfill"

export default defineNuxtPlugin( () => {
  ( globalThis as typeof globalThis & { Temporal: typeof Temporal } ).Temporal = Temporal
} )
