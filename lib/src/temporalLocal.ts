import { Temporal } from "@js-temporal/polyfill"

/**
 * Returns the local time zone.
 * - In browser: uses Intl API
 * - In server: falls back to "UTC" or process.env.TZ if defined
 */
export const getLocalTimeZone = (): string => {
  if ( typeof window !== "undefined" ) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  // Use environment TZ if available, else UTC
  return process.env.TZ || "UTC"
}

/** Convert an ISO timestamp to a ZonedDateTime in the local zone */
export const toLocalZonedDateTime = ( iso: string ): Temporal.ZonedDateTime => {
  const tz = getLocalTimeZone()
  return Temporal.Instant.from( iso ).toZonedDateTimeISO( tz )
}

/** Convert an ISO timestamp to a PlainDate in the local zone */
export const toLocalPlainDate = ( iso: string ): Temporal.PlainDate =>
  toLocalZonedDateTime( iso ).toPlainDate()

/** Convert an ISO timestamp to a PlainDateTime in the local zone */
export const toLocalPlainDateTime = ( iso: string ): Temporal.PlainDateTime =>
  toLocalZonedDateTime( iso ).toPlainDateTime()

/** Convert a local PlainDate (assumed midnight local) to a UTC ISO string */
export const toUtcIsoFromPlainDate = ( date: Temporal.PlainDate ): string => {
  const tz = getLocalTimeZone()
  const localDateTime = date.toPlainDateTime( { hour: 0, minute: 0 } )
  const zoned = localDateTime.toZonedDateTime( tz )
  return zoned.toInstant().toString()
}

/** Convert a local PlainDateTime to a UTC ISO string */
export const toUtcIsoFromPlainDateTime = ( dateTime: Temporal.PlainDateTime ): string => {
  const tz = getLocalTimeZone()
  const zoned = dateTime.toZonedDateTime( tz )
  return zoned.toInstant().toString()
}

/**
   * Format a Temporal object (PlainDate, PlainDateTime, ZonedDateTime, Instant)
   * using the user's locale.
   */
export  const formatTemporal = (
  temporal:
      | Temporal.PlainDate
      | Temporal.PlainDateTime
      | Temporal.ZonedDateTime
      | Temporal.Instant,
  options?: Intl.DateTimeFormatOptions
): string => {
  // Infer sensible defaults if none provided
  let fmt: Intl.DateTimeFormatOptions

  if ( options ) {
    fmt = options
  } else if ( temporal instanceof Temporal.PlainDate ) {
    fmt = { dateStyle: "medium" }
  } else if (
    temporal instanceof Temporal.PlainDateTime ||
      temporal instanceof Temporal.ZonedDateTime
  ) {
    fmt = { dateStyle: "medium", timeStyle: "short" }
  } else if ( temporal instanceof Temporal.Instant ) {
    fmt = { dateStyle: "medium", timeStyle: "short" }
  } else {
    fmt = { dateStyle: "medium" }
  }

  const locale = typeof navigator !== "undefined" ? navigator.language : "en-GB"

  // If Instant, convert to ZonedDateTime first using local zone
  if ( temporal instanceof Temporal.Instant ) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return temporal.toZonedDateTimeISO( tz ).toLocaleString( locale, fmt )
  }

  return temporal.toLocaleString( locale, fmt )
}
