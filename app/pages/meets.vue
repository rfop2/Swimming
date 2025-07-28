<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { DayPilotNavigator, DayPilotCalendar, DayPilotMonth, DayPilot } from "@daypilot/daypilot-lite-vue"
  import { haversineDistance, type Meet } from "lib"
  import { addDays, formatISO, parse } from "date-fns"

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

  const events = computed( () => {
    return ( meets.value ?? [] ).map( ( meet, index ) => ( {
      // id: Number( meet.id ),
      id: index + 1,
      // start: parse( meet.date, "yyyy-MM-dd", new Date() ),
      start: new DayPilot.Date( formatISO( parse( meet.date, "yyyy-MM-dd", new Date() ) ) ),
      end: new DayPilot.Date( formatISO( addDays( parse( meet.date, "yyyy-MM-dd", new Date() ), meet.duration ?? 1 ) ) ),
      text: meet.name,
    } ) )
  } )

  console.log( events.value )
  const startDate = ref( DayPilot.Date.today() )
  console.log( startDate.value )
  const viewType = ref( "Week" )
  const dp = ref<DayPilotCalendar | null>( null )
  watch( startDate, value => {
    console.log( "SD", value, dp.value )
    if ( dp.value ) {
      dp.value.control.update()
    }
  } )

  const firstDay = DayPilot.Date.today().firstDayOfWeek().addDays( 1 )
  console.log( firstDay )
  const event = { id: 1, start: firstDay.addHours( 9 ), end: firstDay.addHours( 10 ), text: "Event 1", color: "#93c47d"}
  console.log( event )
</script>

<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">
          Qualifying
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          County and regional qualifying times for each event
        </p>
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
