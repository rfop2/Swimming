import type { Temporal as TemporalType } from "temporal-polyfill"

declare global {
  var Temporal: typeof TemporalType
}

export {}
