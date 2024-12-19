<script setup lang="ts">
  import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
  import { type Swimmer, secondsToTime } from "lib"
  import { Line } from "vue-chartjs"
  import {  Chart as ChartJS, CategoryScale, LinearScale, TimeScale, PointElement, LineElement, Title, Tooltip, Legend, type ChartData, type ChartOptions, type TooltipItem } from "chart.js"
  import "chartjs-adapter-date-fns"

  import type { InternalApi } from "nitropack"

  definePageMeta( {
    layout: "secure",
    // middleware: [ "protected" ]
  } )

  const courses = [
    {
      value: "lc",
      label: "Long",
    },
    {
      value: "sc",
      label: "Short",
    }
  ]
  const strokes = [
    {
      value: "freestyle",
      label: "Freestyle",
    },
    {
      value: "breaststroke",
      label: "Breaststroke",
    },
    {
      value: "butterfly",
      label: "Butterfly",
    },
    {
      value: "backstroke",
      label: "Backstroke",
    },
    {
      value: "individual_medley",
      label: "Individual Medley",
    },
  ]
  const distances = [
    {
      value: "50m",
      label: "50m",
    },
    {
      value: "100m",
      label: "100m",
    },
    {
      value: "200m",
      label: "200m",
    },
  ]

  const selections = reactive( {
    course: courses[1],
    stroke: strokes[0],
    distance: distances[0],
  } )
  const query = computed( () => Object.fromEntries( Object.entries( selections ).map( ( [ label, option ] ) => ( [ label, option.value ] ) ) ) )

  const swimmer = useState<Swimmer>( "swimmer" )

  type ApiResponse = InternalApi["/api/results/:id"]["get"]
  type ResultType = ApiResponse[number]
  /* interface AreaDetail extends Partial<ApiResponse[number]> {
    label: string
  } */

  const resultsUrl = computed( ()=> ( `/api/results/${swimmer.value.id}` ) )
  const { data: records } = await useFetch(
    resultsUrl,
    {
      query: query,
      watch: [ swimmer, query ],
      transform( records: ApiResponse ) : Array<ResultType> {
        records.sort( ( a, b ) => {
          if ( a.date < b.date ) {
            return -1
          } else if ( a.date > b.date ) {
            return 1
          }
          if ( a.round < b.round ) {
            return 1
          } else if ( a.round > b.round ) {
            return -1
          }
          return 0
        } )
        return records
      },
    }
  )

  const { updateSort, getSortIcon, sortRecords } = useMultiSort<ResultType>()

  const sortedRecords = computed( () => sortRecords( records.value as Array<ResultType> ) )

  ChartJS.register(
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  )

  const data = computed<ChartData<"line",number[],string>>( () => ( {
    labels: ( records?.value || [] ).map( record => record.date ),
    datasets: [
      {
        label: "Time",
        backgroundColor: "#3b82f6",
        // data: ( records?.value || [] ).map( record => ( { x: record.date, y: Number( record.time ) } ) )
        data: ( records?.value || [] ).map( record => Number( record.time ) )
      }
    ]
  } ) )

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time",
        time: {
          unit: "month",
          tooltipFormat: "MMM do, yyyy"
        },
        title: {
          display: true,
          text: "Date"
        }
      },
      y: {
        title: {
          display: true,
          text: "Time"
        }
      }
    },
    plugins: {
      legend: {
        display: false // Hides the legend
      },
      tooltip: {
        callbacks: {
          label: ( context: TooltipItem<"line"> ) => {
            const label = context.dataset.label || ""
            return `${label}: ${secondsToTime( context.raw as number )}`
          }
        }
      }
    }
  }

</script>

<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">
          Results
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          Results and progress in each event.
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
                      v-for="option in strokes"
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
    <div
      v-if="data.datasets[0].data.length > 0"
      class="overflow-x-auto"
    >
      <div
        id="chart-container"
        class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8"
      >
        <Line
          height="300"
          :data="data"
          :options="options"
        />
      </div>
    </div>
    <div class="overflow-x-auto">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <table class="min-w-full divide-y divide-gray-300">
          <thead>
            <tr class="divide-x divide-gray-200">
              <th
                scope="col"
                class="sortable whitespace-nowrap align-bottom pl-4 pr-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pl-0"
                @click="updateSort('date')"
              >
                <span>Date</span><i :class="getSortIcon('date')" />
              </th>
              <th
                scope="col"
                class="whitespace-nowrap align-bottom px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
                @click="updateSort('time')"
              >
                <span>Time</span><i :class="getSortIcon('time')" />
              </th>
              <th
                scope="col"
                class="whitespace-nowrap align-bottom px-2 py-3.5 text-right text-sm font-semibold text-gray-900"
              >
                Points
              </th>
              <th
                scope="col"
                class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Round
              </th>
              <th
                scope="col"
                class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Meet
              </th>
              <th
                scope="col"
                class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Venue
              </th>
              <th
                scope="col"
                class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Club
              </th>
              <th
                scope="col"
                class="sortable whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Level
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr
              v-for="row in sortedRecords"
              :key="`${row.date}-${row.round}`"
              class="divide-x divide-gray-200"
            >
              <td class="whitespace-nowrap py-2 pl-4 pr-3 text-right text-sm font-medium text-gray-900 sm:pl-0">
                {{ row.date }}
              </td>
              <td class="whitespace-nowrap p-2 text-right text-sm text-gray-900">
                {{ row.time ? secondsToTime( row.time ) : '' }}
              </td>
              <td class="whitespace-nowrap p-2 text-right text-sm text-gray-900">
                {{ row.wa_pts }}
              </td>
              <td class="whitespace-nowrap p-2 text-sm text-gray-900">
                {{ row.round === "H" ? "Heat" : ( row.round === "F" ? "Final" : "?" ) }}
              </td>
              <td class="whitespace-nowrap p-2 text-sm text-gray-900">
                {{ row.meet }}
              </td>
              <td class="whitespace-nowrap p-2 text-sm text-gray-900">
                {{ row.venue }}
              </td>
              <td class="whitespace-nowrap p-2 text-sm text-gray-900">
                {{ row.club_swam_under }}
              </td>
              <td class="whitespace-nowrap py-2 pl-3 pr-4 text-sm text-gray-500 sm:pr-0">
                {{ row.level }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
#chart-container {
  height: 400px;
}
</style>
