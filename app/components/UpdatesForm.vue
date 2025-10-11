<script setup lang="ts">
  import { ArrowPathIcon, ClockIcon, XMarkIcon } from "@heroicons/vue/24/outline"
  import type { FetchError } from "ofetch"
  import type { User } from "lucia"
  import { format } from "date-fns"
  import type { Swimmer } from "lib"

  const props = defineProps<{
    user: User
    swimmers: Swimmer[]
  }>()

  const { tasks, createTask, createTasks, deleteTask } = useTasks()

  const swimmerTasks = computed( () => Object.fromEntries( props.swimmers.map( swimmer => ( [ swimmer.id, ( ( tasks.value ?? [] ).filter( task => task.targetType === "swimmer" && task.targetId === swimmer.id ) ?? [] ) ] ) ) ) )

  const genders = [
    {
      label: "Open/Male",
      value: "male"
    },
    {
      label: "Female",
      value: "female"
    },
  ]

  const selectAll = ref( false )
  const selected = ref( Object.fromEntries( props.swimmers.map( s => ( [ s.id, 0 ] ) ) ) )
  const toggleAll = ( event: Event ) => {
    selected.value = Object.fromEntries( props.swimmers.map( s => ( [ s.id, Number( ( event.target as HTMLInputElement ).checked ) ] ) ) )
  }
  watch( selected, ( newSelected ) => {
    selectAll.value = Object.values( newSelected ).every( v => !!v )
  }, { deep: true } )

  const updateAll = ( updateType: string = "basic" ) => {
    try {
      const updateTasks = props.swimmers.map( s => ( {
        taskType: "update",
        taskOptions: updateType,
        targetType: "swimmer",
        targetId: s.id,
      } ) )
      createTasks( updateTasks )
    } catch ( error ) {
      console.error( "Error", error )
      throw createError( error as FetchError )
    }
  }

  const updateSelected = ( updateType: string = "basic" ) => {
    try {
      const updateTasks = Object.entries( selected.value ).filter( s => !!s[1] ).map( s => ( {
        taskType: "update",
        taskOptions: updateType,
        targetType: "swimmer",
        targetId: s[0],
      } ) )
      createTasks( updateTasks )
      selected.value = Object.fromEntries( props.swimmers.map( s => ( [ s.id, 0 ] ) ) )
    } catch ( error ) {
      console.error( "Error", error )
      throw createError( error as FetchError )
    }
  }

  const updateSwimmer = async ( swimmerIndex: number, updateType: string ) => {
    const swimmer = props.swimmers[swimmerIndex]
    try {
      createTask( {
        taskType: "update",
        taskOptions: updateType,
        targetType: "swimmer",
        targetId: swimmer.id,
      } )
    } catch ( error ) {
      console.error( "Error", error )
      throw createError( error as FetchError )
    }
  }

  const cancelUpdate = async ( swimmerIndex: number ) => {
    const swimmer = props.swimmers[swimmerIndex]
    console.log( "S", swimmer )
    const tasks = swimmerTasks.value[swimmer.id].filter( t => t.taskStatus === "pending" )
    console.log( "T", tasks )
    try {
      for ( const task of tasks ) {
        await deleteTask( task.taskId )
      }
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
            Swimmer update status and last update times.
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            @click="updateSelected()"
          >
            <ArrowPathIcon
              class="-ml-0.5 size-5"
              aria-hidden="true"
            />
            Update selected
          </button>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            @click="updateAll()"
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
                    <UIInput
                      v-model="selectAll"
                      type="checkbox"
                      @click="toggleAll"
                    />
                  </th>
                  <th
                    scope="col"
                    class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
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
                    <UIInput
                      v-model="selected[swimmer.id]"
                      type="checkbox"
                      :true-value="1"
                      :false-value="0"
                    />
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
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
                    <span>{{ swimmer.squad }}</span>
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <span
                      v-if="swimmerTasks[swimmer.id].find( t => t.taskStatus === 'pending' )"
                      title="Update pending"
                    >
                      <ClockIcon
                        class="block h-6 w-6"
                      />
                    </span>
                    <span
                      v-else-if="swimmerTasks[swimmer.id].find( t => t.taskStatus === 'progress' )"
                      title="Update in progress"
                    >
                      <ArrowPathIcon
                        title="Update in progress"
                        class="block h-6 w-6 animate-spin"
                      />
                    </span>
                    <span v-else>{{ swimmer.lastUpdateTime ? format( swimmer.lastUpdateTime, "dd/MM" ) : "" }}</span>
                  </td>
                  <td class="py-2 pr-2 pl-1 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                    <div class="flex gap-2 justify-end">
                      <button
                        v-if="!swimmerTasks[swimmer.id].find( t => t.taskStatus === 'pending' || t.taskStatus === 'progress' )"
                        type="button"
                        title="Update Swimmer"
                        class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                        @click="() => updateSwimmer( swimmerIndex, 'basic' )"
                      >
                        <ArrowPathIcon
                          class="-ml-0.5 size-5"
                          aria-hidden="true"
                        />
                        <span class="sr-only">Refresh, {{ swimmer.fullName }}</span>
                      </button>
                      <button
                        v-if="swimmerTasks[swimmer.id].find( t => t.taskStatus === 'pending' || t.taskStatus === 'progress' )"
                        type="button"
                        title="Cancel Update"
                        class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                        @click="() => cancelUpdate( swimmerIndex )"
                      >
                        <XMarkIcon
                          class="-ml-0.5 size-5"
                          aria-hidden="true"
                        />
                        <span class="sr-only">Cancel update, {{ swimmer.fullName }}</span>
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
  <!--<UI-SuccessNotification
    v-model="saveSuccess"
    title="Successfully saved!"
    text="Account details have been updated."
  />-->
</template>
