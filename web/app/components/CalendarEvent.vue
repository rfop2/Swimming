<script setup lang="ts">
  import type { CalendarEventExternal } from "@schedule-x/calendar"
  import { convertTime, secondsToTime, ucFirst, type CourseType, type IndividualRow, type StrokeType } from "lib"
  import type { MeetEventResults, MeetRaceResults } from "~~/types/meet"

  const props = defineProps<{
    calendarEvent: CalendarEventExternal
    hasStartDate: boolean
  }>()

  const meet: Ref<MeetEventResults> = ref( props.calendarEvent.meet )
  const records: Ref<Map<string, Partial<IndividualRow>>> = ref( props.calendarEvent.records )

  const roundNames = {
    "H": "Heat",
    "S": "Semi-Final",
    "F": "Final",
  }

  const displayResult = ( course: CourseType, stroke: StrokeType, distance: number, result: MeetRaceResults ) => {
    const roundName = roundNames[result.round as keyof typeof roundNames] ?? "Unknown Round"
    const timeString = secondsToTime( result.time )
    const recordKey = `${course}_${stroke}_${distance}m`
    const record = records.value.get( recordKey )
    let output = `${roundName}: ${timeString}`
    if ( record ) {
      const ctime = convertTime( record.course!, course, stroke, distance, result.time! )
      const timeDiff = ctime - record.time!
      const diffString = timeDiff > 0 ? `+${timeDiff.toFixed( 2 )}` : "PB"
      output += ` (${diffString})`
    }
    return output
  }
</script>

<template>
  <div class="sx__month-grid-event-title whitespace-break-spaces">
    <div class="text-sm">
      <div
        v-for="([stroke,distances]) in [...meet.results.entries()]"
        :key="stroke"
      >
        {{ stroke.split( "_" ).map( ( word: string ) => ucFirst( word ) ).join( " " ) }} -
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
                {{ displayResult( meet.course, stroke, distance, result ) }}
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
