<script setup lang="ts">
  import type { CalendarEventExternal } from "@schedule-x/calendar"
  import { secondsToTime } from "lib"

  const props = defineProps<{
    calendarEvent: CalendarEventExternal
    hasStartDate: boolean
  }>()

  // const { formatTemporal } = useTemporal()

  const meet = ref( props.calendarEvent.meet )
  console.log( "M", meet.value )
</script>

<template>
  <div class="sx__month-grid-event-title whitespace-break-spaces">
    <div class="text-sm">
      <div
        v-for="([stroke,distances]) in [...meet.results.entries()]"
        :key="stroke"
      >
        {{ stroke.split( "_" ).map( ( word: string ) => word.charAt( 0 ).toUpperCase() + word.slice( 1 ) ).join( " " ) }} -
        <span
          v-for="([distance,rounds],i) in [...distances.entries()]"
          :key="distance"
          class=""
          :title="`${meet.name}\n${rounds.map( r => `${r.round}:${secondsToTime(r.time)}`)}`"
        >
          <span v-if="i>0">,</span>{{ distance }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sx__month-grid-event-title {
  border: 5px #fff solid;
  background-color: #fff;
  height: auto !important;
}
</style>
