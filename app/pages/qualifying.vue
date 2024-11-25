<script setup lang="ts">
  import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
  import { ActiveTable } from "active-table"

  import type { InternalApi } from "nitropack"

  definePageMeta( {
    layout: "secure",
    // middleware: [ "protected" ]
  } )

  type ApiResponse = InternalApi["/api/qualifying"]["get"]
  type DataType = Array<Array<string | number>>

  const { data: qualifying } = await useFetch(
    "/api/qualifying",
    {
      transform( data: ApiResponse ) : DataType {
        const tableData: DataType = [
          Object.keys( data[0] )
        ]
        for ( const row of data ) {
          tableData.push( Object.values( row ) )
        }
        console.log( "TD", tableData )
        return tableData
      }
    }
  )
  console.log( "Q", qualifying.value )

  const years = [
    "2024",
    "2025"
  ]
  const year = "2024"

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
      <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
        <div class="min-w-48">
          <Listbox
            v-model="year"
            as="div"
          >
            <ListboxLabel class="block text-sm font-medium leading-6 text-gray-900">
              Year
            </ListboxLabel>
            <div class="relative mt-2">
              <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
                <span class="block truncate">Year</span>
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
                    v-for="option in years"
                    :key="option"
                    v-slot="{ active, selected }"
                    as="template"
                    :value="option"
                  >
                    <li :class="[active ? 'bg-indigo-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                      <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option }}</span>

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
    <div class="mt-4 flow-root">
      <div class="overflow-x-auto">
        <ClientOnly>
          <active-table
            :data="qualifying"
          />
        </ClientOnly>
      </div>
    </div>
  </div>
</template>
