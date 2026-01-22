import type { Temporal as TemporalType } from "temporal-polyfill"

export const useTemporal = () => {
  /**
   * Detects local time zone safely.
   * - Client: Browser’s local zone
   * - Server: process.env.TZ or "UTC"
   */
  const getLocalTimeZone = (): string => {
    if ( import.meta.client ) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    return process.env.TZ || "UTC"
  }

  const tz = getLocalTimeZone()

  /** Convert an ISO string to ZonedDateTime in the local zone */
  const toLocalZonedDateTime = ( iso: string ): TemporalType.ZonedDateTime => {
    return Temporal.Instant.from( iso ).toZonedDateTimeISO( tz )
  }

  /** Convert an ISO string to PlainDate in the local zone */
  const toLocalPlainDate = ( iso: string ): TemporalType.PlainDate => {
    return toLocalZonedDateTime( iso ).toPlainDate()
  }

  /** Convert an ISO string to PlainDateTime in the local zone */
  const toLocalPlainDateTime = ( iso: string ): TemporalType.PlainDateTime => {
    return toLocalZonedDateTime( iso ).toPlainDateTime()
  }

  /** Convert a local PlainDate (assumed midnight local) back to UTC ISO */
  const toUtcIsoFromPlainDate = ( date: TemporalType.PlainDate ): string => {
    const localDateTime = date.toPlainDateTime( { hour: 0, minute: 0 } )
    const zoned = localDateTime.toZonedDateTime( tz )
    return zoned.toInstant().toString()
  }

  /** Convert a local PlainDateTime back to UTC ISO */
  const toUtcIsoFromPlainDateTime = ( dateTime: TemporalType.PlainDateTime ): string => {
    const zoned = dateTime.toZonedDateTime( tz )
    return zoned.toInstant().toString()
  }

  // const locale = import.meta.client ? navigator.language : "en-GB"
  const locale = ( () => {
    if ( import.meta.client ) {
      const lang = navigator.language
      return lang === "en" || lang === "en-US" ? "en-GB" : lang
    }
    return "en-GB"
  } )()

  /**
   * Format any Temporal type (PlainDate, PlainDateTime, ZonedDateTime, Instant)
   * using Intl.DateTimeFormat for maximum reliability.
   */
  const formatTemporal = (
    temporal:
      | TemporalType.PlainDate |
      TemporalType.PlainDateTime |
      TemporalType.ZonedDateTime |
      TemporalType.Instant,
    {
      locale = "en-GB",
      tz = "Europe/London",
      options = { dateStyle: "medium" as const },
    }: {
      locale?: string
      tz?: string
      options?: Intl.DateTimeFormatOptions
    } = {}
  ): string => {
    let instant: TemporalType.Instant

    if ( "epochMilliseconds" in temporal ) {
    // ✅ Temporal.Instant
      instant = temporal as TemporalType.Instant
    } else if ( "toInstant" in temporal ) {
    // ✅ Temporal.ZonedDateTime
      instant = ( temporal as unknown as TemporalType.ZonedDateTime ).toInstant()
    } else if ( "toZonedDateTime" in temporal && "hour" in temporal ) {
    // ✅ Temporal.PlainDateTime
      instant = ( temporal as TemporalType.PlainDateTime )
        .toZonedDateTime( tz )
        .toInstant()
    } else if ( "toPlainDateTime" in temporal ) {
    // ✅ Temporal.PlainDate
      instant = ( temporal as TemporalType.PlainDate )
        .toPlainDateTime( { hour: 0 } )
        .toZonedDateTime( tz )
        .toInstant()
    } else {
      throw new TypeError( "Unsupported Temporal type" )
    }

    return new Intl.DateTimeFormat( locale, { ...options, timeZone: tz } ).format(
      instant.epochMilliseconds
    )
  }

  return {
    tz,
    toLocalZonedDateTime,
    toLocalPlainDate,
    toLocalPlainDateTime,
    toUtcIsoFromPlainDate,
    toUtcIsoFromPlainDateTime,
    locale,
    formatTemporal,
  }
}
