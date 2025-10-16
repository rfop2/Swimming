<script setup lang="ts">
  import { Temporal } from "temporal-polyfill"

  export interface DateDefn {
    range: string | undefined
    startDate: string | undefined
    endDate: string | undefined
  }

  const model = defineModel<DateDefn>( { required: true } )

  const props = withDefaults( defineProps<{
    labelled?: boolean
  }>(), {
    labelled: true,
  } )

  const dateRanges = [
    { label: "All Time", value: "" },
    { label: "Last Year", value: "last-year" },
    { label: "Last Two Years", value: "last2-year" },
    { label: "Last Three Years", value: "last3-year" },
    { label: "Last Four Years", value: "last4-year" },
    { label: "Last Five Years", value: "last5-year" },
    { label: "Custom", value: "custom" },
  ]

  const range = ref( dateRanges.find( r => r.value === model.value.range ) ?? ( !model.value.startDate && !model.value.endDate ? dateRanges[0] : dateRanges[dateRanges.length - 1] ) )

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
      const [ when, _period ] = range.split( "-" )
      const now = Temporal.Now.zonedDateTimeISO( tz )
      start = now.subtract( { years: Number( when.slice( 4, 5 ) || "1" ) } )
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
      model.value.endDate = undefined
    }
  }, { deep: true } )
</script>

<template>
  <div
    class="grid grid-cols-1 gap-x-4 gap-y-8"
    :class="`sm:grid-cols-2`"
  >
    <div class="sm:col-span-1">
      <UI-Listbox
        v-model="range"
        clearable
        :label="props.labelled ? 'Period' : undefined"
        placeholder="Date Range"
        :options="dateRanges"
      />
    </div>
    <div class="sm:col-span-1">
      <UI-Input
        v-model="model.startDate"
        type="date"
        placeholder="Start Date"
        :label="labelled ? 'Start Date' : undefined"
        :max="model.endDate"
        @change="range = dateRanges[dateRanges.length-1]"
      />
    </div>
    <div class="hidden sm:col-span-1">
      <UI-Input
        v-model="model.endDate"
        type="date"
        placeholder="End Date"
        :label="labelled ? 'End Date' : undefined"
        :min="model.startDate"
        @change="range = dateRanges[dateRanges.length-1]"
      />
    </div>
  </div>
</template>
