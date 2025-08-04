<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { DayPilotNavigator, DayPilotCalendar, DayPilotMonth, DayPilot } from "@daypilot/daypilot-lite-vue"
  import { haversineDistance, type Meet } from "lib"
  import { addDays, formatISO, parse } from "date-fns"
  import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"

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
  console.log( meets )

  interface GroupedMeet {
    id: string
    start: string
    end: string
    duration: number
    meets: Array<ExtMeet>
  }

  interface ListedMeet extends GroupedMeet {
    text: string
    color?: string
    tags: Record<string, unknown>
  }

  const MAX_MEETS = 2

  const colors = [
    {name: "Green", id: "#93c47d"},
    {name: "Yellow", id: "#ffd966"},
    {name: "Orange", id: "#f6b26b"},
    {name: "Red", id: "#ff5163"},
    {name: "Gray", id: "#cccccc"},
  ]

  const distanceColor = ( distance: number | null ) => {
    if ( !distance )
      return colors[colors.length - 1].id
    if ( distance < 50 )
      return colors[0].id
    if ( distance < 75 )
      return colors[1].id
    if ( distance < 100 )
      return colors[2].id
    return colors[3].id
  }

  const events = computed( () => {
    const groupedMeets = ( meets.value ?? [] ).reduce( ( groupedMeets, meet ) => {
      const tag = `${meet.date}`
      if ( !groupedMeets[tag] ) {
        groupedMeets[tag] = {
          id: meet.id,
          // start: formatISO( parse( meet.date, "yyyy-MM-dd", new Date() ) ),
          start: meet.date,
          // end: formatISO( endOfDay( addDays( parse( meet.date, "yyyy-MM-dd", new Date() ), meet.duration ? meet.duration - 1 : 0 ) ) ),
          end: formatISO( addDays( parse( meet.date, "yyyy-MM-dd", new Date() ), meet.duration ?? 1 ), { representation: "date" } ),
          duration: meet.duration as number,
          meets: [ meet ]
        }
      } else {
        groupedMeets[tag].meets.push( meet )
      }
      return groupedMeets
    }, {} as Record<string,GroupedMeet> )
    const listedMeets = Object.values( groupedMeets ).reduce( ( listedMeets, meetGroup ) => {
      for ( const meet of meetGroup.meets.splice( 0, MAX_MEETS ) ) {
        listedMeets.push( {
          ...meetGroup,
          text: meet.name,
          color: distanceColor( meet.distance ),
          tags: {
            abc: 123,
          },
          meets: []
        } )
      }
      if ( meetGroup.meets.length ) {
        listedMeets.push( {
          ...meetGroup,
          text: `+${meetGroup.meets.length} meets`,
          meets: meetGroup.meets,
          tags: {},
        } )
      }
      return listedMeets
    }, [] as Array<ListedMeet> )
    return listedMeets
  } )

  console.log( "NAV", navigator, typeof navigator )
  console.log( events.value )
  const startDate = ref( DayPilot.Date.today() )
  console.log( startDate.value )
  const dp = ref<DayPilotCalendar | null>( null )
  watch( startDate, value => {
    console.log( "SD", value, dp.value )
    if ( dp.value ) {
      dp.value.control.update()
    }
  } )

  const courses = [
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
      value: "1",
      label: "Level 1",
    },
    {
      value: "2",
      label: "Level 2",
    },
    {
      value: "3",
      label: "Level 3",
    },
    {
      value: "4",
      label: "Level 4",
    },
  ]
  const distances = [
    {
      value: "50",
      label: "<50 miles",
    },
    {
      value: "100",
      label: "<100 miles",
    },
    {
      value: "1000",
      label: "All distances",
    },
  ]

  const selections = reactive( {
    course: courses[0],
    level: levels[0],
    distance: distances[2],
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
      <div class="">
        <ClientOnly>
          <DayPilotNavigator
            :config="{
              selectMode: viewType,
              showMonths: 3,
              skipMonths: 3,
            }"
            @time-range-selected="(args: DayPilot.NavigatorTimeRangeSelectedArgs) => startDate = args.day"
          />
          <DayPilotCalendar
            :config="{
              viewType: 'Week',
              startDate: startDate,
              showMonths: 3,
              events: events,
            }"
          />
          <DayPilotMonth
            ref="dp"
            :config="{
              startDate: startDate,
              showMonths: 3,
              events: events,
            }"
          />
        </ClientOnly>
      </div>
    </div>
  </div>
</template>
