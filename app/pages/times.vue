<script setup lang="ts">
  import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
  import classNames from "classnames"
  import { getYear } from "date-fns"
  import { COURSES, type IndividualRow, strokes, secondsToTime, getSwimmerAgeGroup, convertTime, getSwimmerAge } from "lib"

  import type { InternalApi } from "nitropack"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  const strokeOptions = Object.entries( strokes ).map( ( [ stroke, strokeData ] ) => ( { value: stroke, label: strokeData.label } ) )

  const route = useRoute()
  const slug = Array.isArray( route.params.slug ) ? route.params.slug : []

  const selections = reactive( {
    stroke: strokeOptions.find( option => option.value === slug[1] ) ?? strokeOptions[0],
  } )

  const { swimmers } = await useSwimmers()
  const swimmersMap = computed( () => Object.fromEntries( swimmers.value.map( swimmer => [ swimmer.id, swimmer ] ) ) )

  type ApiResponse = InternalApi["/api/personal"]["get"]

  const { data: records } = await useFetch<ApiResponse>(
    "/api/personal/",
  )

  // type QualifyingApiResponse = InternalApi["/api/qualifying"]["get"]
  const { data: qualifyingInfo } = await useFetch(
    "/api/qualifying",
  )

  const filteredRecords = computed( () => ( records.value || [] ).filter( record => record.stroke === selections.stroke.value ) )

  const distances = computed( () => strokes[selections.stroke.value].distances )

  interface  QualifiedRow extends IndividualRow {
    qualified: string
    altQualified: string
  }

  const groupedRecords = computed( () => {
    const currentYear = getYear( new Date() )
    const map: Record<string,Record<string,Record<string,QualifiedRow | null>>> = {}
    for ( const row of filteredRecords.value ) {
      if ( !map[row.swimmer] ) {
        map[row.swimmer] = {}
      }
      if ( !map[row.swimmer][row.course] ) {
        map[row.swimmer][row.course] = Object.fromEntries( distances.value.map( distance => [ distance, null ] ) )
      }
      const swimmer = swimmersMap.value[row.swimmer]
      const swimmerAge = getSwimmerAgeGroup( swimmer )
      const baseQualifyingTimes = ( qualifyingInfo.value ?? [] ).filter( q => {
        if ( q.year !== currentYear )
          return false
        if ( q.stroke !== row.stroke )
          return false
        if ( q.distance !== row.distance )
          return false
        if ( q.gender !== swimmer.gender )
          return false
        if ( q.age !== swimmerAge )
          return false
        if ( q.scope === "county" && q.area !== swimmer.county )
          return false
        if ( q.scope === "regional" && q.area !== swimmer.region )
          return false
        if ( q.scope === "national" && q.area !== swimmer.nationality )
          return false
        return true
      } ).map( ( q ) => ( {
        ...q,
        convertedTime: convertTime( q.course, row.course, row.stroke, row.distance, q.time )
      } ) )
      const qualifyingTimes = baseQualifyingTimes.filter( q => {
        return ( Number( row.time ) <= q.convertedTime )
      } )
      const qualified =
        qualifyingTimes.find( q => q.scope === "national" ) ??
        qualifyingTimes.find( q => q.scope === "regional" ) ??
        qualifyingTimes.find( q => q.scope === "county" )
      // console.log( "T", qualifyingTimes.find( q => q.scope === "national" ), qualifyingTimes.find( q => q.scope === "regional" ), qualifyingTimes.find( q => q.scope === "county" ) )
      const altQualifyingTimes = baseQualifyingTimes.filter( q => {
        return ( Number( row.time ) <= q.convertedTime )
      } )
      const altQualified =
        altQualifyingTimes.find( q => q.scope === "national" ) ??
        altQualifyingTimes.find( q => q.scope === "regional" ) ??
        altQualifyingTimes.find( q => q.scope === "county" )
      // console.log( unref( swimmer ), unref( row ), "B", unref( baseQualifyingTimes ), "Q", unref( qualifyingTimes ), qualified, "A", unref( altQualifyingTimes ), altQualified )
      map[row.swimmer][row.course][row.distance] = {
        ...row,
        qualified: qualified ? qualified.scope : "none",
        altQualified: altQualified ? altQualified.scope : "none"
      }
    }
    return map
  } )
</script>

<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">
          Distance times per stroke
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          Best times for strokes at each distance. Converted times shown in brackets if better than course time.
          Times in colour are inside consideration times for <span class="qualified-county">county</span>, <span class="qualified-regional">region</span>, <span class="qualified-national">country</span>.
        </p>
      </div>
    </div>
    <div class="border-b border-gray-200 pb-5 sm:flex sm:items-center sm:justify-between">
      <div class="mt-3">
        <div class="flex items-center space-x-4">
          <div class="min-w-72">
            <Listbox
              v-model="selections.stroke"
              as="div"
            >
              <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900">
                Stroke
              </ListboxLabel>
              <div class="relative mt-2">
                <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
                  <span class="block truncate">{{ selections.stroke.label }}</span>
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
                      v-for="option in strokeOptions"
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
    <div class="overflow-x-auto">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <table class="min-w-full divide-y divide-gray-300">
          <thead>
            <tr class="divide-x divide-gray-200">
              <th
                scope="col"
                class="whitespace-nowrap align-bottom pl-4 pr-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pl-0"
              >
                Swimmer
              </th>
              <th
                scope="col"
                class="whitespace-nowrap align-bottom px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
              >
                Course
              </th>
              <th
                v-for="distance in distances"
                :key="distance"
                scope="col"
                class="whitespace-nowrap align-bottom px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
              >
                <span>{{ distance }}</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <template
              v-for="(courseRecords,swimmerId) in groupedRecords"
              :key="swimmerId"
            >
              <tr
                v-for="(distanceRow,course) in courseRecords"
                :key="`${course}`"
                class="divide-x divide-gray-200"
                :class="classNames({ '!border-t-2 !border-gray-400': course === Object.keys(courseRecords)[0] })"
              >
                <!-- Only render the first cell once per group, with rowspan -->
                <td
                  v-if="course === Object.keys(courseRecords)[0]"
                  :rowspan="Object.entries(courseRecords).length"
                  class="whitespace-wrap sm:whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
                >
                  {{ swimmers ? swimmersMap[swimmerId].name : "Unknown swimmer" }} ({{ getSwimmerAge(swimmersMap[swimmerId]) }})
                </td>
                <td
                  class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
                  :class="['px-2 py-1', course !== Object.keys(courseRecords)[0] ? 'border-l' : '']"
                >
                  {{ COURSES[course] }}<span class="hidden sm:inline"> Course</span>
                </td>
                <td
                  v-for="distance in distances"
                  :key="distance"
                  class="whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
                >
                  <span v-if="distanceRow && distanceRow[distance]">
                    <span :class="`qualified-${distanceRow[distance].qualified}`">{{ secondsToTime( distanceRow[distance].time ) }}</span>
                    <span
                      v-if="(courseRecords[course === 'lc' ? 'sc' : 'lc']?.[distance]?.converted_time ?? Infinity) < distanceRow[distance].time"
                      class="italic"
                      :class="`qualified-${courseRecords[course === 'lc' ? 'sc' : 'lc']?.[distance]?.altQualified}`"
                    >
                      ({{ secondsToTime(courseRecords[course === 'lc' ? 'sc' : 'lc']?.[distance]?.converted_time ?? 0) }})
                    </span>
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
span {
  &.qualified-county {
    color: #22c55e;
  }

  &.qualified-regional {
    color: #f97416;
  }

  &.qualified-national {
    color: #ef4444;
  }
}
</style>
