import { Temporal } from "temporal-polyfill"

export default defineNitroPlugin( () => {
  ( globalThis as typeof globalThis & { Temporal: typeof Temporal } ).Temporal = Temporal
} )
