import { Temporal } from "@js-temporal/polyfill"

export type Period = "hour" | "day" | "week" | "month" | "quarter" | "year"
export type PeriodWhen = "current" | "last"

export interface PeriodBounds {
  start: Temporal.ZonedDateTime
  end: Temporal.ZonedDateTime // exclusive end
}

/**
 * Returns start and exclusive-end Temporal.ZonedDateTime for a given period.
 * Example: [start, end) — inclusive start, exclusive end
 *
 * @param period - "hour" | "day" | "week" | "month" | "quarter" | "year"
 * @param when - "current" (default) or "last"
 * @param tz - IANA timezone string (default: "UTC")
 */
export function getPeriodBounds(
  period: Period,
  when: PeriodWhen = "current",
  tz = "Europe/London"
): PeriodBounds {
  const now = Temporal.Now.zonedDateTimeISO( tz )
  let start: Temporal.ZonedDateTime
  let end: Temporal.ZonedDateTime

  switch ( period ) {
    // 🕐 Hour
    case "hour": {
      const startOfHour = now.with( {
        minute: 0,
        second: 0,
        millisecond: 0
      } )
      start = when === "last" ? startOfHour.subtract( { hours: 1 } ) : startOfHour
      end = start.add( { hours: 1 } )
      break
    }

    // 🌞 Day
    case "day": {
      const startOfDay = now.with( {
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0
      } )
      start = when === "last" ? startOfDay.subtract( { days: 1 } ) : startOfDay
      end = start.add( { days: 1 } )
      break
    }

    // 📅 Week (ISO week: Monday–Sunday)
    case "week": {
      const startOfWeek = now
        .subtract( { days: now.dayOfWeek - 1 } )
        .with( { hour: 0, minute: 0, second: 0, millisecond: 0 } )
      start = when === "last" ? startOfWeek.subtract( { weeks: 1 } ) : startOfWeek
      end = start.add( { weeks: 1 } )
      break
    }

    // 📆 Month
    case "month": {
      const startOfMonth = now.with( {
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0
      } )
      start = when === "last" ? startOfMonth.subtract( { months: 1 } ) : startOfMonth
      end = start.add( { months: 1 } )
      break
    }

    // 🧮 Quarter (3-month blocks)
    case "quarter": {
      const quarterStartMonth = Math.floor( ( now.month - 1 ) / 3 ) * 3 + 1
      const startOfQuarter = now.with( {
        month: quarterStartMonth,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0
      } )
      start = when === "last" ? startOfQuarter.subtract( { months: 3 } ) : startOfQuarter
      end = start.add( { months: 3 } )
      break
    }

    // 📅 Year
    case "year": {
      const startOfYear = now.with( {
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0
      } )
      start = when === "last" ? startOfYear.subtract( { years: 1 } ) : startOfYear
      end = start.add( { years: 1 } )
      break
    }

    default:
      throw new Error( `Unsupported period: ${period}` )
  }

  return { start, end: end.subtract( { days: 1 } ) }
}
