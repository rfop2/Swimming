<script setup lang="ts">
  import { getYear } from "date-fns"
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

  const currentYear = getYear( new Date() )
  const yearSpan = 5

  const dateRanges: UISelection[] = [
    { label: "All Time", value: "" },
  ]
  Array.from( Array( yearSpan ).keys() )
    .forEach( i => {
      dateRanges.push( { label: `${currentYear - i}${i ? " - " + currentYear : ""}`, value: String( currentYear - i ) } )
    } )

  const range = ref( ( dateRanges.find( r => r.value === model.value.range ) ?? ( !model.value.startDate && !model.value.endDate ? dateRanges[0] : dateRanges[dateRanges.length - 1] ) ).value )

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
      start = Temporal.ZonedDateTime.from( {
        timeZone: tz,
        year: Number( range.substring( 0, 4 ) ),
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0
      } )
    }
    return { start, end }
  }

  watch( range, ( newRange ) => {
    model.value.range = String( newRange )
    const dates = getDatesFromRange( String( newRange ) )
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
  <UI-Listbox
    v-model="range"
    clearable
    :label="props.labelled ? 'Period' : undefined"
    placeholder="Date Range"
    :options="dateRanges"
  />
</template>
