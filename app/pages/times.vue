<script setup lang="ts">
  import classNames from "classnames"
  import { getYear } from "date-fns"
  import { COURSES, type IndividualRow, strokes, secondsToTime, getSwimmerAgeGroup, convertTime, getSwimmerAge, type QualifyingRow } from "lib"

  import type { InternalApi } from "nitropack"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Times",
    meta: [
      { name: "description", content: "Swimmer best times by stroke and distance" }
    ]
  } )

  const route = useRoute()
  const slug = Array.isArray( route.params.slug ) ? route.params.slug : []

  const { swimmers } = useSwimmers()

  const squadOptions = computed( () => [ { label: "All Swimmers", value: "*" }, ...Array.from( swimmers.value.reduce( ( sq, s ) => {
    if ( s.squad )
      sq.add( s.squad )
    return sq
  }, new Set<string>() ) ).sort().map( s => ( { label: s, value: s } ) ), { label: "No squad", value: "" } ] )

  const strokeOptions = Object.entries( strokes ).map( ( [ stroke, strokeData ] ) => ( { value: stroke, label: strokeData.label } ) )

  const { state: selections } = usePersisted( "times-selection", {
    squad: ( squadOptions.value.find( option => option.value === slug[0] ) ?? squadOptions.value[0] ).value,
    stroke: ( strokeOptions.find( option => option.value === slug[1] ) ?? strokeOptions[0] ).value,
  }, "reactive" )

  const filteredSwimmers = computed( () => ( swimmers.value || [] ).filter( swimmer => selections.squad.value === "*" || swimmer.squad === selections.squad.value ) )

  const swimmersMap = computed( () => Object.fromEntries( filteredSwimmers.value.map( swimmer => [ swimmer.id, swimmer ] ) ) )

  type ApiResponse = InternalApi["/api/personal"]["get"]

  const { data: records } = await useFetch<ApiResponse>(
    "/api/personal/",
  )

  // type QualifyingApiResponse = InternalApi["/api/qualifying"]["get"]
  const { data: qualifyingInfo } = await useFetch(
    "/api/qualifying",
  )

  const filteredRecords = computed( () => ( records.value || [] ).filter( record => record.stroke === selections.stroke && swimmersMap.value[record.swimmer] ) )

  const distances = computed( () => strokes[selections.stroke].distances )

  interface QualifiedRow extends IndividualRow {
    qualified?: QualifyingRow
    altQualified?: QualifyingRow
  }

  const groupedRecords = computed( () => {
    const currentYear = getYear( new Date() )
    const map = new Map<string, Map<string, Map<string, QualifiedRow | null>>>()
    for ( const row of filteredRecords.value ) {
      if ( !map.has( row.swimmer ) ) {
        map.set( row.swimmer, new Map() )
      }
      if ( !map.get( row.swimmer )?.has( row.course ) ) {
        map.get( row.swimmer )?.set( row.course, new Map( distances.value.map( distance => [ distance, null ] ) ) )
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
      if ( map.get( row.swimmer )?.has( row.course ) ) {
        map.get( row.swimmer )?.get( row.course )?.set( row.distance, {
          ...row,
          qualified,
          altQualified
        } )
      }
    }
    const sortedMap = new Map( [ ...map.entries() ].sort( ( [ keyA, _valA ], [ keyB, _valB ] ) => {
      const genderSort = swimmersMap.value[keyA].gender.localeCompare( swimmersMap.value[keyB].gender )
      if ( genderSort )
        return genderSort
      const birthdaySort = swimmersMap.value[keyA].birthday.localeCompare( swimmersMap.value[keyB].birthday )
      if ( birthdaySort )
        return birthdaySort
      const lastSort = swimmersMap.value[keyA].lastName.localeCompare( swimmersMap.value[keyB].lastName )
      if ( lastSort )
        return lastSort
      return swimmersMap.value[keyA].firstName.localeCompare( swimmersMap.value[keyB].firstName )
    } ) )
    return sortedMap
  } )
</script>

<template>
  <StandardPage
    title="Distance times per stroke"
  >
    <template #description>
      Best times for strokes at each distance. Converted times shown in brackets if better than course time.
      Times in colour are inside consideration times for <span class="qualified-county">county</span>, <span class="qualified-regional">region</span><!--, <span class="qualified-national">country</span>-->.
    </template>
    <template #controls>
      <div class="min-w-48">
        <UI-Listbox
          v-model="selections.squad"
          :options="squadOptions"
          label="Squad"
          placeholder="Choose Squad"
        />
      </div>
      <div class="min-w-48">
        <UI-Listbox
          v-model="selections.stroke"
          :options="strokeOptions"
          label="Stroke"
          placeholder="Choose Stroke"
        />
      </div>
    </template>
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
              v-for="[swimmerId,courseRecords] in [...groupedRecords].filter( ( [ id ] ) => swimmersMap[id].gender !== 'female' )"
              :key="swimmerId"
            >
              <tr
                v-for="[course,distanceRow] in [...courseRecords]"
                :key="`${course}`"
                class="divide-x divide-gray-200"
                :class="classNames({ '!border-t-2 !border-gray-400': course === courseRecords.keys().next().value })"
              >
                <!-- Only render the first cell once per group, with rowspan -->
                <td
                  v-if="course === courseRecords.keys().next().value"
                  :rowspan="courseRecords.size"
                  class="whitespace-wrap sm:whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
                >
                  {{ swimmers ? swimmersMap[swimmerId].fullName : "Unknown swimmer" }} ({{ getSwimmerAge(swimmersMap[swimmerId]) }})
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
                  <span v-if="distanceRow.get( distance )">
                    <span :class="`qualified-${distanceRow.get( distance )?.qualified?.scope??'none'}`">{{ secondsToTime( distanceRow.get( distance )?.time ?? 0 ) }}</span>
                    <span
                      v-if="(courseRecords.get( course === 'lc' ? 'sc' : 'lc')?.get( distance )?.converted_time ?? Infinity) < (distanceRow?.get( distance )?.time ?? 0)"
                      class="italic"
                      :class="`qualified-${courseRecords.get( course === 'lc' ? 'sc' : 'lc' )?.get( distance )?.altQualified?.scope??'none'}`"
                    >
                      ({{ secondsToTime(courseRecords.get( course === 'lc' ? 'sc' : 'lc' )?.get( distance )?.converted_time ?? 0) }})
                    </span>
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
          <tbody class="divide-y divide-gray-200 bg-white">
            <template
              v-for="[swimmerId,courseRecords] in [...groupedRecords].filter( ( [ id ] ) => swimmersMap[id].gender === 'female' )"
              :key="swimmerId"
            >
              <tr
                v-for="[course,distanceRow] in [...courseRecords]"
                :key="`${course}`"
                class="divide-x divide-gray-200"
                :class="classNames({ '!border-t-2 !border-gray-400': course === courseRecords.keys().next().value })"
              >
                <!-- Only render the first cell once per group, with rowspan -->
                <td
                  v-if="course === courseRecords.keys().next().value"
                  :rowspan="courseRecords.size"
                  class="whitespace-wrap sm:whitespace-nowrap px-2 py-2 text-right text-sm text-gray-900"
                >
                  {{ swimmers ? swimmersMap[swimmerId].fullName : "Unknown swimmer" }} ({{ getSwimmerAge(swimmersMap[swimmerId]) }})
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
                  <span v-if="distanceRow.get( distance )">
                    <span :class="`qualified-${distanceRow.get( distance )?.qualified?.scope??'none'}`">{{ secondsToTime( distanceRow.get( distance )?.time ?? 0 ) }}</span>
                    <span
                      v-if="(courseRecords.get( course === 'lc' ? 'sc' : 'lc')?.get( distance )?.converted_time ?? Infinity) < (distanceRow?.get( distance )?.time ?? 0)"
                      class="italic"
                      :class="`qualified-${courseRecords.get( course === 'lc' ? 'sc' : 'lc' )?.get( distance )?.altQualified?.scope??'none'}`"
                    >
                      ({{ secondsToTime(courseRecords.get( course === 'lc' ? 'sc' : 'lc' )?.get( distance )?.converted_time ?? 0) }})
                    </span>
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </StandardPage>
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
