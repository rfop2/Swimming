<script setup lang="ts">
  import { ArrowPathIcon, CheckIcon, ClockIcon, XMarkIcon } from "@heroicons/vue/24/outline"
  import type { FetchError } from "ofetch"
  import { COUNTIES, NATIONALITIES, REGIONS, type Swimmer } from "lib"
  import type { User } from "lucia"
  import { format } from "date-fns"

  const props = defineProps<{
    user: User
    swimmers: Swimmer[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveFn: ( values: any ) => void
    reloadFn: () => void
  }>()

  watchEffect( () => {
    console.log( "PS", props.swimmers )
  } )
  // const currentUser = useAuthenticatedUser()
  // const isAdmin = !!Number( currentUser.value.admin )

  const genders =
    [ {
        label: "Open/Male",
        value: "male"
      },
      {
        label: "Female",
        value: "female"
      },
    ]
  const nationalities = Object.entries( NATIONALITIES ).map( (
    [ value, label ] ) => ( {
    value,
    label
  } ) )
  const regions = Object.entries( REGIONS ).map( ( [ value, label ] ) => ( {
    value,
    label
  } ) )
  const counties = Object.entries( COUNTIES ).map( ( [ value, label ] ) => ( {
    value,
    label
  } ) )

  const fetchSwimmer = async ( swimmerIndex: number, cancel: boolean = false ) => {
    const swimmer = props.swimmers[swimmerIndex]
    try {
      await $fetch(
        `/api/swimmers/${swimmer.id}`,
        {
          method: "PATCH",
          body: JSON.stringify( { action: cancel ? "cancel" : "basic" } ),
        }
      )
      await props.reloadFn()
    } catch ( error ) {
      console.error( "Error", error )
      throw createError( error as FetchError )
    }
  }
</script>

<template>
  <div class="border-b border-gray-900/10 pt-8 pb-12">
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-base font-semibold text-gray-900">
            Swimmers
          </h1>
          <p class="mt-2 text-sm text-gray-700">
            Swimmer status and last update times .
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            @click="updateAll"
          >
            <ArrowPathIcon
              class="-ml-0.5 size-5"
              aria-hidden="true"
            />
            Update all
          </button>
        </div>
      </div>
      <div class="mt-8 flow-root">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table class="relative min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th
                    scope="col"
                    class="py-3.5 pr-1 pl-2 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                  >
                    Id
                  </th>
                  <th
                    scope="col"
                    class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Gender
                  </th>
                  <th
                    scope="col"
                    class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Birthday
                  </th>
                  <th
                    scope="col"
                    class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Nationality
                  </th>
                  <th
                    scope="col"
                    class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Region
                  </th>
                  <th
                    scope="col"
                    class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    County
                  </th>
                  <th
                    scope="col"
                    class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Squad
                  </th>
                  <th
                    scope="col"
                    class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Updated
                  </th>
                  <th
                    scope="col"
                    class="py-1.5 pr-2 pl-1 sm:pr-0"
                  >
                    <span class="sr-only">Update</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="(swimmer, swimmerIndex) in swimmers"
                  :key="swimmer.id"
                >
                  <td class="py-1 pr-1 pl-2 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0">
                    <span>{{ swimmer.id }}</span>
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <span>{{ swimmer.fullName }}</span>
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <span>{{ genders.find( item => item.value === swimmer.gender )?.label }}</span>
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <span>{{ swimmer.birthday }}</span>
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <span>{{ nationalities.find( item => item.value === swimmer.nationality )?.label }}</span>
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <span>{{ regions.find( item => item.value === swimmer.region )?.label }}</span>
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <span>{{ counties.find( item => item.value === swimmer.county )?.label }}</span>
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <span>{{ swimmer.squad }}</span>
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <span>
                      <CheckIcon
                        v-if="!!swimmer.active"
                        class="block h-6 w-6"
                      />
                      <XMarkIcon
                        v-if="!swimmer.active"
                        class="block h-6 w-6"
                      />
                    </span>
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <ClockIcon
                      v-if="swimmer.updateStatus==='pending'"
                      :title="swimmer.updateType"
                      class="block h-6 w-6"
                    />
                    <ArrowPathIcon
                      v-if="swimmer.updateStatus==='progress'"
                      :title="swimmer.updateType"
                      class="block h-6 w-6"
                    />
                    <span v-else>{{ swimmer.lastUpdateTime ? format( swimmer.lastUpdateTime, "dd/MM" ) : "" }}</span>
                  </td>
                  <td class="py-2 pr-2 pl-1 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                    <div class="flex gap-2 justify-end">
                      <button
                        v-if="!swimmer.updateStatus"
                        type="button"
                        class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                        @click="() => fetchSwimmer( swimmerIndex )"
                      >
                        <ArrowPathIcon
                          class="-ml-0.5 size-5"
                          aria-hidden="true"
                        />
                        <span class="sr-only">Refresh, {{ swimmer.fullName }}</span>
                      </button>
                      <button
                        v-if="swimmer.updateStatus"
                        type="button"
                        class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                        @click="() => fetchSwimmer( swimmerIndex, true )"
                      >
                        <XMarkIcon
                          class="-ml-0.5 size-5"
                          aria-hidden="true"
                        />
                        <span class="sr-only">Cancel refresh, {{ swimmer.fullName }}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!--<UI-Confirm
    v-if="deleting !== null"
    title="Delete swimmer"
    :text="`Are you sure you want to delete swimmer '${fields[deleting].value.fullName}' from your account?`"
    confirm-label="Delete"
    :action="deleteSwimmer"
  />-->
  <UI-Dialog
    v-model="showLookup"
    title="Lookup swimmer"
    confirm-label="Select"
    :confirm-enabled="() => !!foundSwimmer.id"
    :action="async () => { await addSwimmer() }"
  >
    <div class="px-3 py-5 sm:p-6">
      <div class="mt-2 max-w-xl text-sm text-gray-500">
        <p>Enter a swimmer id to lookup details.</p>
      </div>
      <form class="mt-5 sm:flex sm:items-center">
        <div class="w-full sm:max-w-xs">
          <input
            id="swimmerId"
            v-model="swimmerId"
            type="text"
            aria-label="Swimmer Id"
            class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600  sm:text-sm/6"
            placeholder="1234567890"
          >
        </div>
        <button
          type="button"
          class="mt-3 inline-flex w-full items-center justify-center rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600  disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed sm:ml-3 sm:mt-0 sm:w-auto"
          :disabled="!swimmerId.length"
          @click="lookupSwimmer"
        >
          Lookup
        </button>
      </form>
      <div
        v-if="foundSwimmer.id"
        class="mt-2 max-w-xl text-sm text-gray-500"
      >
        <p>
          Found - {{ foundSwimmer.firstName }} {{ foundSwimmer.lastName }} ({{ foundSwimmer.birthday?.substring( 0, 4 ) }}) click 'Select' to continue,
        </p>
      </div>
    </div>
  </UI-Dialog>
  <!--<UI-SuccessNotification
    v-model="saveSuccess"
    title="Successfully saved!"
    text="Account details have been updated."
  />-->
</template>
