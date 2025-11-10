<script setup lang="ts">
  import type { CalendarEventExternal } from "@schedule-x/calendar"
  import { secondsToTime } from "lib"

  const props = defineProps<{
    calendarEvent: CalendarEventExternal
    hasStartDate: boolean
  }>()

  // const { formatTemporal } = useTemporal()

  const meet: Ref<MeetResults> = ref( props.calendarEvent.meet )
  console.log( "M", meet.value )

  const roundNames = {
    "H": "Heat",
    "S": "Semi-Final",
    "F": "Final",
  }
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
        >
          <span v-if="i>0">,</span><UI-Tooltip>
            <template #content>
              <p>{{ meet.name }}</p>
              <span
                v-for="result in rounds"
                :key="result.round"
              >
                {{ roundNames[result.round as keyof typeof roundNames] ?? "Unknown Round" }}: {{ secondsToTime(result.time) }}
                <span /></span></template>
            {{ distance }}
          </UI-Tooltip>
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
