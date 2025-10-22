<script setup lang="ts">
  import { getPeriodBounds, type Period, type PeriodWhen } from "lib"
  import type { Temporal } from "temporal-polyfill"

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

  const range = ref( dateRanges.find( r => r.value === model.value.range ) ?? ( !model.value.startDate && !model.value.endDate ? dateRanges[0] : dateRanges[dateRanges.length - 1] ) )
  const group = ref( dateGroups.find( g => g.value === model.value.group ) )

  const getDatesFromRange = ( range: string ) => {
    const tz = "Europe/London"

    let start: Temporal.ZonedDateTime | null = null
    let end: Temporal.ZonedDateTime | null = null
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

  watch( range, ( newRange ) => {
    model.value.range = newRange.value
    const dates = getDatesFromRange( newRange.value )
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
  }, { deep: true } )

  watch( group, ( newGroup ) => {
    model.value.group = newGroup?.value
  }, { deep: true } )
</script>

<template>
  <div
    class="grid grid-cols-1 gap-x-4 gap-y-8"
    :class="grouped ? 'sm:grid-cols-4' : 'sm:grid-cols-3'"
  >
    <div class="sm:col-span-1">
      <UI-Listbox
        v-model="range"
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
        @change="range = filteredRanges[filteredRanges.length-1]"
      />
    </div>
    <div class="sm:col-span-1">
      <UI-Input
        v-model="model.endDate"
        type="date"
        placeholder="End Date"
        :label="labelled ? 'End Date' : undefined"
        :min="model.startDate"
        @change="range = filteredRanges[filteredRanges.length-1]"
      />
    </div>
    <div class="sm:col-span-1">
      <UI-Listbox
        v-if="grouped"
        v-model="group"
        :label="labelled ? 'Group' : undefined"
        placeholder="Date Group"
        :options="dateGroups"
      />
    </div>
  </div>
</template>
