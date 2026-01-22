<script setup lang="ts">
  import type { Temporal as TemporalType } from "temporal-polyfill"

  export interface DateDefn {
    range: string | undefined
    startDate: string | undefined
    endDate: string | undefined
    group?: string
  }

  const model = defineModel<DateDefn>( { required: true } )

  const props = withDefaults( defineProps<{
    labelled?: boolean
    grouped?: boolean
    showLast?: boolean
    maxPeriod?: string
    minPeriod?: string
  }>(), {
    labelled: true,
    grouped: false,
    showLast: false,
    maxPeriod: "year",
    minPeriod: "week",
  } )

  const dateRanges = [
    { label: "All Time", value: "" },
    { label: "This Year", value: "current-year" },
    { label: "Last Year", value: "last-year" },
    { label: "This Quarter", value: "current-quarter" },
    { label: "Last Quarter", value: "last-quarter" },
    { label: "This Month", value: "current-month" },
    { label: "Last Month", value: "last-month" },
    { label: "This Week", value: "current-week" },
    { label: "Last Week", value: "last-week" },
    { label: "Custom", value: "custom" },
  ]

  type Period = "hour" | "day" | "week" | "month" | "quarter" | "year"
  type PeriodWhen = "current" | "last"

  interface PeriodBounds {
    start: TemporalType.ZonedDateTime
    end: TemporalType.ZonedDateTime // exclusive end
  }

  /**
   * Returns start and exclusive-end Temporal.ZonedDateTime for a given period.
   * Example: [start, end) — inclusive start, exclusive end
   *
   * @param period - "hour" | "day" | "week" | "month" | "quarter" | "year"
   * @param when - "current" (default) or "last"
   * @param tz - IANA timezone string (default: "UTC")
   */
  const getPeriodBounds = (
    period: Period,
    when: PeriodWhen = "current",
    tz = "Europe/London"
  ): PeriodBounds => {
    const now = Temporal.Now.zonedDateTimeISO( tz )
    let start: TemporalType.ZonedDateTime
    let end: TemporalType.ZonedDateTime

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

  const filteredRanges = computed( () => {
    const ranges = dateRanges.filter( r => props.showLast ? true : !r.value.includes( "last-" ) )
    const maxIndex = ranges.findIndex( r => r.value.includes( props.maxPeriod ) )
    if ( maxIndex > 1 ) {
      ranges.splice( 1, maxIndex - 1 )
    }
    const minIndex = ranges.findLastIndex( r => r.value.includes( props.minPeriod ) )
    if ( minIndex >= 0 && minIndex < ranges.length - 1 ) {
      ranges.splice( minIndex + 1, ( ranges.length - 2 ) - minIndex )
    }
    return ranges
  } )

  const dateGroups = [
    { label: "By Day", value: "day" },
    { label: "By Week", value: "week" },
    { label: "By Month", value: "month" },
    { label: "By Quarter", value: "quarter" },
    { label: "By Year", value: "year" },
  ]

  const getDatesFromRange = ( range: string ) => {
    const tz = "Europe/London"

    let start: TemporalType.ZonedDateTime | null = null
    let end: TemporalType.ZonedDateTime | null = null
    if ( range === "" ) {
      start = null
      end = null
    } else if ( range === "custom" ) {
      return undefined
    } else {
      const [ when, period ] = range.split( "-" );
      ( { start, end } = getPeriodBounds( period as Period, when as PeriodWhen, tz ) )
    }
    return { start, end }
  }

  watch( () => model.value.range, ( newRange ) => {
    if ( newRange ) {
      const dates = getDatesFromRange( newRange )
      if ( dates ) {
        if ( dates.start ) {
          model.value.startDate = dates.start.toPlainDate().toString()
        } else {
          model.value.startDate = undefined
        }
        if ( dates.end ) {
          model.value.endDate = dates.end.toPlainDate().toString()
        } else {
          model.value.endDate = undefined
        }
      }
    }
  }, { deep: true } )
</script>

<template>
  <div
    class="grid grid-cols-1 gap-x-4 gap-y-8"
    :class="grouped ? 'sm:grid-cols-4' : 'sm:grid-cols-3'"
  >
    <div class="sm:col-span-1">
      <UI-Listbox
        v-model="model.range"
        clearable
        :label="labelled ? 'Period' : undefined"
        placeholder="Date Range"
        :options="filteredRanges"
      />
    </div>
    <div class="sm:col-span-1">
      <UI-Input
        v-model="model.startDate"
        type="date"
        placeholder="Start Date"
        :label="labelled ? 'Start Date' : undefined"
        :max="model.endDate"
        @change="model.range = 'custom'"
      />
    </div>
    <div class="sm:col-span-1">
      <UI-Input
        v-model="model.endDate"
        type="date"
        placeholder="End Date"
        :label="labelled ? 'End Date' : undefined"
        :min="model.startDate"
        @change="model.range = 'custom'"
      />
    </div>
    <div class="sm:col-span-1">
      <UI-Listbox
        v-if="grouped"
        v-model="model.group"
        :label="labelled ? 'Group' : undefined"
        placeholder="Date Group"
        :options="dateGroups"
      />
    </div>
  </div>
</template>
