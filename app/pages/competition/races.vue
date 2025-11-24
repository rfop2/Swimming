<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { Temporal } from "@js-temporal/polyfill"
  import {
    createCalendar,
    createViewDay,
    createViewList,
    createViewMonthAgenda,
    createViewMonthGrid,
    createViewWeek,
  } from "@schedule-x/calendar"
  import type { CalendarApp, CalendarEventExternal } from "@schedule-x/calendar"
  import { createEventsServicePlugin } from "@schedule-x/events-service"
  import "@schedule-x/theme-default/dist/index.css"
  import StandardPage from "~/components/StandardPage.vue"
  import CalendarEvent from "~/components/CalendarEvent.vue"
  import type { IndividualRow } from "lib"
  import type { MeetDistanceResults, MeetEventResults, MeetRaceResults, MeetStrokeResults } from "~/types/meet"

  const ScheduleXCalendar = defineAsyncComponent( () =>
    import( "@schedule-x/vue" ).then( mod => mod.ScheduleXCalendar )
  )

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Races",
    meta: [
      { name: "description", content: "View historical meets and results" }
    ]
  } )

  const { swimmer } = useSwimmer()
  console.log( "S", swimmer )

  type ResultsApiResponse = InternalApi["/api/results/:id"]["get"]
  type RecordsApiResponse = InternalApi["/api/personal/:id"]["get"]

  // Better type narrowing guard
  const hasSwimmer = ( s: typeof swimmer ): s is typeof swimmer & { value: NonNullable<typeof s.value> } => s.value != null && s.value !== undefined

  const roundOrder = {
    "": 0,
    "H": 1,
    "R": 2,
    "S": 3,
    "C": 3,
    "F": 5,
  }

  const results: Ref<ResultsApiResponse> = ref( [] )
  const records: Ref<RecordsApiResponse> = ref( [] )

  watchEffect( async () => {
    if ( hasSwimmer( swimmer ) ) {
      results.value = await $fetch( `/api/results/${swimmer.value.id}` )
      records.value = await $fetch( `/api/personal/${swimmer.value.id}` )
    }
  } )

  const recordsMap = computed( () => new Map<string, Partial<IndividualRow>>( ( records.value ?? [] )
    .map( ( record: IndividualRow ) => {
      const { course, stroke, distance, time, converted_time, date } = record
      const key = `${course}_${stroke}_${distance}`
      return [ key, {
        course,
        stroke,
        distance,
        time,
        converted_time,
        date,
      } ]
    } ) )
  )

  const meetsMap = computed( () => results.value.reduce( ( meets, result ) => {
    const race: MeetRaceResults = {
      round: result.round,
      time: Number( result.time ),
      points: result.wa_pts,
    }
    const distanceMetres = Number( result.distance.replace( /m$/, "" ) )
    const meetDate = Temporal.PlainDate.from( result.date )
    const meet = meets.get( result.meet )
    if ( !meet ) {
      const distances: MeetDistanceResults = new Map()
      distances.set( distanceMetres, [ race ] )
      const strokes: MeetStrokeResults = new Map()
      strokes.set( result.stroke, distances )
      const meetResult: MeetEventResults = {
        id: meets.size + 1,
        name: result.meet,
        venue: result.venue,
        level: result.level,
        date: meetDate,
        duration: 1,
        course: result.course,
        results: strokes,
      }
      meets.set( result.meet, meetResult )
    } else {
      if ( Temporal.PlainDate.compare( meetDate, meet.date ) !== 0 ) {
        // find the earlier one
        const earliest = Temporal.PlainDate.compare( meetDate, meet.date ) <= 0 ? meetDate : meet.date
        const latest = Temporal.PlainDate.compare( meetDate, meet.date ) <= 0 ? meet.date : meetDate
        meet.date = earliest

        // difference in days
        meet.duration = 1 + latest.since( earliest ).days

        // console.log( meet )
      }
      if ( meet.course !== result.course ) {
        console.error( "Course mismatch", meet, result )
      }
      const stroke = meet.results.get( result.stroke )
      if ( !stroke ) {
        const distances: MeetDistanceResults = new Map()
        distances.set( distanceMetres, [ race ] )
        meet.results.set( result.stroke, distances )
      } else {
        const distance = stroke.get( distanceMetres )
        if ( !distance ) {
          stroke.set( distanceMetres, [ race ] )
        } else {
          distance.push( race )
          distance.sort( ( a, b ) => (
            ( roundOrder[a.round as keyof typeof roundOrder] ?? 0 ) - ( roundOrder[b.round as keyof typeof roundOrder] ?? 0 )
          ) )
        }
      }
    }
    return meets
  }, new Map<string, MeetEventResults>() )
  )

  const meets = computed( () => Array.from( meetsMap.value.values() ) )

  interface CalendarEvent extends CalendarEventExternal {
    duration: number
    color?: string
    meet: MeetEventResults
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

  const { state: selections } = usePersisted( "races-selection", {
    course: courses[0].value,
    level: levels.map( l => ( l.value ) ),
    club: "",
  }, "reactive" )

  const events = computed( () => {
    const calendarEvents = ( meets.value || [] ).map( ( meet ): CalendarEvent => ( {
      id: meet.id,
      start: meet.date,
      end: meet.date.add( { days: ( meet.duration ?? 1 ) - 1 } ),
      duration: meet.duration as number,
      title: `${meet.level}: ${meet.name}`,
      // color: distanceColor( meet.distance ,
      location: meet.venue,
      description: "xxx, yyy",
      _options: {
        disableDND: true,
        disableResize: true,
        additionalClasses: [
          `course-${meet.course}`,
          `level-${meet.level}`,
        ],
      },
      // calendarId: distanceCalendar( meet.distance ),
      meet,
      records: recordsMap,
    } ) )
    const filteredEvents = calendarEvents.filter( event => {
      if ( selections.course && selections.course !== event.meet.course )
        return false
      if ( selections.level.length === 0 || !selections.level.includes( event.meet.level ) )
        return false
      return true
    } )
    return filteredEvents
  } )

  const customComponents = {
    monthGridEvent: CalendarEvent,
  }

  const eventsServicePlugin = createEventsServicePlugin()

  const calendarApp = import.meta.client
    ? createCalendar( {
      selectedDate: Temporal.Now.plainDateISO(),
      maxDate: Temporal.Now.plainDateISO(),
      locale: "en-GB",
      timezone: "Europe/London",
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
      events: events.value,
      plugins: [ eventsServicePlugin ],
    } )
    : null

  watchEffect( () => {
    if ( import.meta.client ) {
      if ( eventsServicePlugin && eventsServicePlugin.set ) {
        eventsServicePlugin.set( events.value )
      }
    }
  } )

  watch( selections, ( ns ) => {
    console.trace( "NS", ns )
  }, { deep: true } )
</script>

<template>
  <StandardPage
    title="Meets"
  >
    <template #description>
      Forthcoming events and competitions
    </template>
    <template #controls>
      <SwimmerSelector v-model="swimmer" />
    </template>
    <ClientOnly>
      <ScheduleXCalendar
        :calendar-app="calendarApp as CalendarApp"
        :custom-components="customComponents"
      />
    </ClientOnly>
  </StandardPage>
</template>

<style lang="scss">
  .sx__month-grid-cell {
    height: auto !important;
  }
  .sx__month-grid-day {
    min-height: 9em;
  }
  .course-lc {
    .sx__month-grid-event-title {
      font-style: italic;
    }
  }
  .meet-tagged-1 {
    .sx__month-grid-event-title {
      font-weight: bold;
    }
  }
</style>
