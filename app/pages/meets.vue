<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { haversineDistance, type Meet } from "lib"
  import { addDays, formatISO, parse } from "date-fns"
  import { ScheduleXCalendar } from "@schedule-x/vue"
  import {
    createCalendar,
    createViewDay,
    createViewList,
    createViewMonthAgenda,
    createViewMonthGrid,
    createViewWeek,
  } from "@schedule-x/calendar"
  import type { CalendarApp, CalendarEventExternal } from "@schedule-x/calendar"
  import { createEventModalPlugin } from "@schedule-x/event-modal"
  import { createEventsServicePlugin } from "@schedule-x/events-service"
  import "@schedule-x/theme-default/dist/index.css"
  import CalendarModal from "~/components/CalendarModal.vue"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  type ApiResponse = InternalApi["/api/meets"]["get"]

  interface ExtMeet extends Meet {
    distance: number | null
  }

  const baseLocation = {
    latitude: 51.5844700, longitude: -2.0982042
  }

  const { data: meets } = await useFetch(
    "/api/meets",
    {
      transform( data: ApiResponse ): Array<ExtMeet> {
        const extData = data.map( row => {
          return {
            ...row,
            ...{
              distance: row.latitude && row.longitude ? haversineDistance( baseLocation, { latitude: row.latitude, longitude: row.longitude } ) : null,
            }
          }
        } )
        extData.sort( ( a, b ) => {
          // 1. Sort by date
          if ( a.date !== b.date ) return a.date.localeCompare( b.date )

          // 2. Sort by duration
          const durationDiff = a.duration - b.duration
          if ( durationDiff !== 0 ) return durationDiff

          // 3. Sort by distance (nulls last)
          const distanceA = a.distance ?? Infinity
          const distanceB = b.distance ?? Infinity
          const distanceDiff = distanceA - distanceB
          if ( distanceDiff !== 0 ) return distanceDiff

          // 4. Sort by name (alphabetically)
          return a.name.localeCompare( b.name )
        } )
        return extData
      },
    }
  )

  interface CalendarEvent extends CalendarEventExternal {
    duration: number
    color?: string
    meet: ExtMeet
  }

  const courses = [
    {
      value: "",
      label: "All Courses",
    },
    {
      value: "sc",
      label: "Short",
    },
    {
      value: "lc",
      label: "Long",
    },
  ]
  const levels = [
    {
      value: 1,
      label: "Level 1",
    },
    {
      value: 2,
      label: "Level 2",
    },
    {
      value: 3,
      label: "Level 3",
    },
    {
      value: 4,
      label: "Level 4",
    },
  ]
  const distances = [
    {
      value: 0,
      label: "All Distances",
    },
    {
      value: 25,
      label: "<25 Miles",
    },
    {
      value: 50,
      label: "<50 Miles",
    },
    {
      value: 75,
      label: "<75 Miles",
    },
    {
      value: 100,
      label: "<100 Miles",
    },
  ]

  const selections = reactive( {
    course: courses[0],
    level: levels,
    distance: distances[0],
  } )

  const distanceCalendar = ( distance: number | null ) => {
    if ( !distance )
      return "distanceNone"
    if ( distance < 25 )
      return "distance25"
    if ( distance < 50 )
      return "distance50"
    if ( distance < 75 )
      return "distance75"
    if ( distance < 100 )
      return "distance100"
    return "distanceFar"
  }

  const events = computed( () => {
    const calendarEvents = ( meets.value || [] ).map( ( meet ) : CalendarEvent => ( {
      id: meet.id,
      start: meet.date,
      end: formatISO( addDays( parse( meet.date, "yyyy-MM-dd", new Date() ), ( meet.duration ?? 1 ) - 1 ), { representation: "date" } ),
      duration: meet.duration as number,
      title: `${meet.level}: ${meet.name}`,
      // color: distanceColor( meet.distance ),
      location: `${meet.location} (~${Math.round( meet.distance || 0 )} miles)`,
      description: meet.type,
      _options: {
        disableDND: true,
        disableResize: true,
        additionalClasses: [
          `course-${meet.course}`,
          `level-${meet.level}`,
        ],
      },
      calendarId: distanceCalendar( meet.distance ),
      meet,
    } ) )
    const filteredEvents = calendarEvents.filter( event => {
      if ( selections.course.value && selections.course.value !== event.meet.course )
        return false
      if ( selections.level.length === 0 || !selections.level.map( level => level.value ).includes( event.meet.level ) )
        return false
      if ( selections.distance.value && event.meet.distance && selections.distance.value < event.meet.distance )
        return false
      return true
    } )
    return filteredEvents
  } )

  const customComponents = {
    eventModal: CalendarModal,
  }

  const eventModal = createEventModalPlugin()
  const eventsServicePlugin = createEventsServicePlugin()

  const calendarApp = import.meta.client ? createCalendar( {
    selectedDate: formatISO( new Date(), { representation: "date" } ),
    firstDayOfWeek: 1,
    defaultView: "month-grid",
    views: [
      createViewDay(),
      createViewWeek(),
      createViewMonthGrid(),
      createViewMonthAgenda(),
      createViewList(),
    ],
    monthGridOptions: {
      nEventsPerDay: 8,
    },
    isResponsive: true,
    callbacks: {
      /* onEventClick( calendarEvent: CalendarEventExternal, _e: UIEvent ) {
        console.log( "onEventClick", calendarEvent )
      }, */
      onDoubleClickEvent( calendarEvent: CalendarEventExternal, _e: UIEvent ) {
        console.log( "onDoubleClickEvent", calendarEvent )
        window.open( `https://www.swimmingresults.org/licensed_meets/meet.php?meet=${calendarEvent.id}&page=1&region=P&level=P&month=P&year=P`, "_blank", "noopener,noreferrer" )
      },
    },
    calendars: {
      distance25: {
        colorName: "distance25",
        lightColors: {
          main: "#a8d5a2",         // soft pastel green
          container: "#e6f5e4",    // very light green
          onContainer: "#2f4a2d",  // deep green text
        }
      },
      distance50: {
        colorName: "distance50",
        lightColors: {
          main: "#c5ce4e",         // yellow-green
          container: "#f3f7c6",    // pale yellow-green
          onContainer: "#464b1e",  // dark olive text
        }
      },
      distance75: {
        colorName: "distance75",
        lightColors: {
          main: "#f9d71c",         // bright pastel yellow
          container: "#fff5aa",    // soft yellow background
          onContainer: "#594800",  // dark yellow-brown text
        }
      },
      distance100: {
        colorName: "distance100",
        lightColors: {
          main: "#f4a259",         // medium orange
          container: "#ffe3c7",    // light orange
          onContainer: "#5a3200",  // dark orange text
        }
      },
      distanceFar: {
        colorName: "distanceFar",
        lightColors: {
          main: "#e26d6d",         // deeper pastel red
          container: "#ffd6d6",    // soft red background
          onContainer: "#4f1d1d",  // dark red text
        }
      },
      distanceNone: {
        colorName: "distanceNone",
        lightColors: {
          main: "#999999",         // medium grey
          container: "#e0e0e0",    // light grey background
          onContainer: "#333333",  // dark grey text
        }
      },
    },
    events: events.value,
    plugins: [ eventModal,eventsServicePlugin ],
  } ) : null

  watchEffect( () => {
    if ( import.meta.client ) {
      if ( eventsServicePlugin && eventsServicePlugin.set ) {
        eventsServicePlugin.set( events.value )
      }
    }
  } )

</script>

<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">
          Meets
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          Forthcoming events and competitions
        </p>
      </div>
    </div>
    <div class="border-b border-gray-200 pb-5 sm:flex sm:items-center sm:justify-between">
      <div class="mt-3">
        <div class="flex items-center space-x-4">
          <div class="min-w-48">
            <UIListbox v-model="selections.course" :options="courses" label="Course" />
          </div>
          <div class="min-w-72">
            <UIListbox v-model="selections.level" :options="levels" label="Level" placeholder="All Levels" multiple/>
          </div>
          <div class="min-w-48">
            <UIListbox v-model="selections.distance" :options="distances" label="Distance" />
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4 flow-root">
      <ClientOnly>
        <ScheduleXCalendar
          :calendar-app="calendarApp as CalendarApp"
          :custom-components="customComponents"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<style lang="scss">
  .sx__month-grid-day {
    min-height: 9em;
  }
  .course-lc {
    .sx__month-grid-event-title {
      font-style: italic;
    }
  }
</style>
