<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { haversineDistance, type Meet } from "lib"
  import { addDays, formatISO, parse } from "date-fns"
  import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
  import { ScheduleXCalendar } from "@schedule-x/vue"
  import {
    createCalendar,
    createViewDay,
    createViewList,
    createViewMonthAgenda,
    createViewMonthGrid,
    createViewWeek,
  } from "@schedule-x/calendar"
  import type { CalendarEventExternal } from "@schedule-x/calendar"
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
      value: 0,
      label: "All Levels",
    },
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
    level: levels[0],
    distance: distances[0],
  } )

  const distanceCalendar = ( distance: number | null ) => {
    if ( !distance )
      return "distanceNone"
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
      title: meet.name,
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
      if ( selections.level.value && selections.level.value !== event.meet.level )
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
      distance50: {
        colorName: "distance50",
        lightColors: {
          main: "#7cc87c",         // medium pastel green
          container: "#d5f0d5",    // soft green background
          onContainer: "#264b26",  // deep green text
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
          main: "#f4a259",         // richer orange
          container: "#ffe3c7",    // light orange background
          onContainer: "#5a3200",  // dark orange-brown text
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
            <Listbox
              v-model="selections.course"
              as="div"
            >
              <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900">
                Course
              </ListboxLabel>
              <div class="relative mt-2">
                <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
                  <span class="block truncate">{{ selections.course.label }}</span>
                  <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      class="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </span>
                </ListboxButton>
                <transition
                  leave-active-class="transition ease-in duration-100"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                >
                  <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    <ListboxOption
                      v-for="option in courses"
                      :key="option.value"
                      v-slot="{ active, selected }"
                      as="template"
                      :value="option"
                    >
                      <li :class="[active ? 'bg-indigo-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                        <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>

                        <span
                          v-if="selected"
                          :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"
                        >
                          <CheckIcon
                            class="h-5 w-5"
                            aria-hidden="true"
                          />
                        </span>
                      </li>
                    </ListboxOption>
                  </ListboxOptions>
                </transition>
              </div>
            </Listbox>
          </div>
          <div class="min-w-72">
            <Listbox
              v-model="selections.level"
              as="div"
            >
              <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900">
                Level
              </ListboxLabel>
              <div class="relative mt-2">
                <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
                  <span class="block truncate">{{ selections.level.label }}</span>
                  <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      class="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </span>
                </ListboxButton>
                <transition
                  leave-active-class="transition ease-in duration-100"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                >
                  <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    <ListboxOption
                      v-for="option in levels"
                      :key="option.value"
                      v-slot="{ active, selected }"
                      as="template"
                      :value="option"
                    >
                      <li :class="[active ? 'bg-indigo-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                        <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>

                        <span
                          v-if="selected"
                          :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"
                        >
                          <CheckIcon
                            class="h-5 w-5"
                            aria-hidden="true"
                          />
                        </span>
                      </li>
                    </ListboxOption>
                  </ListboxOptions>
                </transition>
              </div>
            </Listbox>
          </div>
          <div class="min-w-48">
            <Listbox
              v-model="selections.distance"
              as="div"
            >
              <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900">
                Distance
              </ListboxLabel>
              <div class="relative mt-2">
                <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
                  <span class="block truncate">{{ selections.distance.label }}</span>
                  <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      class="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </span>
                </ListboxButton>
                <transition
                  leave-active-class="transition ease-in duration-100"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                >
                  <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    <ListboxOption
                      v-for="option in distances"
                      :key="option.value"
                      v-slot="{ active, selected }"
                      as="template"
                      :value="option"
                    >
                      <li :class="[active ? 'bg-indigo-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                        <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label }}</span>

                        <span
                          v-if="selected"
                          :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"
                        >
                          <CheckIcon
                            class="h-5 w-5"
                            aria-hidden="true"
                          />
                        </span>
                      </li>
                    </ListboxOption>
                  </ListboxOptions>
                </transition>
              </div>
            </Listbox>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4 flow-root">
      <ClientOnly>
        <ScheduleXCalendar
          :calendar-app="calendarApp"
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
</style>
