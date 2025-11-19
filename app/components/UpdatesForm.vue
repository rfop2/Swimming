<script setup lang="ts">
  import { ArrowPathIcon, ClockIcon, XMarkIcon } from "@heroicons/vue/24/outline"
  import type { FetchError } from "ofetch"
  import type { User } from "lucia"
  import { format } from "date-fns"
  import type { Task } from "lib"

  const props = defineProps<{
    user: User
  }>()

  const { swimmers, refresh: refreshSwimmers } = useSwimmers( props.user.id )

  const { tasks, createTask, createTasks, deleteTask } = useTasks()

  watch( tasks, async () => {
    await refreshSwimmers()
  }, { deep: true } )

  const swimmerTasks = computed( () => Object.fromEntries( swimmers.value.map( swimmer => ( [ swimmer.id, ( ( tasks.value ?? [] ).filter( task => task.targetType === "swimmer" && task.targetId === swimmer.id ) ?? [] ) ] ) ) ) )

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
  const selected = ref( new Array( swimmers.value.length ).fill( 0 ) )

  const toggleAll = ( event: Event ) => {
    selected.value.fill( Number( ( event.target as HTMLInputElement ).checked ) )
  }
  watch( selected, ( newSelected ) => {
    selectAll.value = newSelected.every( s => !!s )
  }, { deep: true } )

  const updateAll = async ( updateType: string, force: boolean ) => {
    try {
      const updateTasks: Array<Partial<Task>> = swimmers.value.map( s => ( {
        taskType: "update",
        taskOptions: JSON.stringify( { updateType, force } ),
        taskDescription: `${updateType.charAt( 0 ).toUpperCase()}${updateType.slice( 1 )} update of swimmer '${s.fullName}'`,
        targetType: "swimmer",
        targetId: s.id,
      } ) )
      await createTasks( updateTasks )
      selected.value.fill( 0 )
    } catch ( error ) {
      console.error( "Error", error )
      throw createError( error as FetchError )
    }
  }

  const updateSelected = async ( updateType: string, force: boolean ) => {
    try {
      const updateTasks: Array<Partial<Task>> = swimmers.value.filter( ( s, i ) => selected.value[i] ).map( s => ( {
        taskType: "update",
        taskOptions: JSON.stringify( { updateType, force } ),
        taskDescription: `${updateType.charAt( 0 ).toUpperCase()}${updateType.slice( 1 )} update of swimmer '${s.fullName}'`,
        targetType: "swimmer",
        targetId: s.id,
      } ) )
      await createTasks( updateTasks )
      selected.value.fill( 0 )
    } catch ( error ) {
      console.error( "Error", error )
      throw createError( error as FetchError )
    }
  }

  const updateSwimmer = async ( swimmerIndex: number, updateType: string, force: boolean ) => {
    const swimmer = swimmers.value[swimmerIndex]
    try {
      await createTask( {
        taskType: "update",
        taskOptions: JSON.stringify( { updateType, force } ),
        taskDescription: `${updateType.charAt( 0 ).toUpperCase()}${updateType.slice( 1 )} update of swimmer '${swimmer.fullName}'`,
        targetType: "swimmer",
        targetId: swimmer.id,
      } )
      selected.value.fill( 0 )
    } catch ( error ) {
      console.error( "Error", error )
      throw createError( error as FetchError )
    }
  }

  const cancelFailed = ref( false )
  const cancelUpdate = async ( swimmerIndex: number ) => {
    const swimmer = swimmers.value[swimmerIndex]
    const tasks = swimmerTasks.value[swimmer.id].filter( t => t.taskStatus === "pending" )
    try {
      for ( const task of tasks ) {
        await deleteTask( task.taskId )
      }
    } catch ( error ) {
      console.error( "Error", error )
      cancelFailed.value = true
      showAlert( `Unable to cancel task: ${( error as FetchError ).message}`, "error" )
      throw createError( error as FetchError )
    }
  }

  const updateOptions = [
    { label: "Basic swimmer data only", value: "individual" },
    { label: "Basic data and event results", value: "results" },
    { label: "Basic data, event results and relative rankings", value: "rankings" },
  ]
  const updateType = ref( "" )
  const force = ref( false )

  const selectUpdateType = ref<boolean>( false )
  const selectedForUpdate = ref<null | number | "selected" | "all">( null )
  watchEffect( () => {
    if ( selectedForUpdate.value !== null ) {
      selectUpdateType.value = true
      updateType.value = ""
    }
  } )

  const queueUpdates = async () => {
    if ( selectedForUpdate.value === "all" ) {
      await updateAll( updateType.value, force.value )
    } else if ( selectedForUpdate.value === "selected" ) {
      await updateSelected( updateType.value, force.value )
    } else if ( selectedForUpdate.value !== null ) {
      await updateSwimmer( selectedForUpdate.value, updateType.value, force.value )
    }
    selectedForUpdate.value = null
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
            class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            :disabled="!Object.entries( selected ).filter( s => !!s[1] ).length"
            @click="selectedForUpdate = 'selected'"
          >
            <ArrowPathIcon
              class="-ml-0.5 size-5"
              aria-hidden="true"
            />
            Update selected
          </button>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-4 sm:flex-none">
          <button
            type="button"
            class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            :disabled="!swimmers.length"
            @click="selectedForUpdate = 'all'"
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
                      v-model="selected[swimmerIndex]"
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
                        @click="selectedForUpdate = swimmerIndex"
                      >
                        <ArrowPathIcon
                          class="-ml-0.5 size-5"
                          aria-hidden="true"
                        />
                        <span class="sr-only">Update, {{ swimmer.fullName }}</span>
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

  <UI-Dialog
    v-model="selectUpdateType"
    title="Choose update type"
    confirm-label="Select"
    :confirm-enabled="() => !!updateType"
    :action="async () => {
      await queueUpdates()
    }"
    :cancel-action="() => {
      selectedForUpdate = null
    }"
  >
    <div class="px-1 py-3 sm:p-2">
      <div class="mt-2 max-w-xl text-sm text-gray-500">
        <p>Select update type to apply to swimmers. The more data is selected the longer an update will take.</p>
      </div>
      <form class="mt-5 sm:flex sm:items-center">
        <div class="w-full sm:max-w-xs">
          <UI-Select
            v-model="updateType"
            label="Update type"
            :options="updateOptions"
            placeholder="Select update type"
          />
        </div>
        <div class="w-full sm:max-w-xs pl-4">
          <UI-input
            v-if="!!user.admin"
            v-model="force"
            type="checkbox"
            label="Force update"
            :true-value="1"
            :false-value="0"
          />
        </div>
      </form>
    </div>
  </UI-Dialog>

  <!--<UI-Confirm
    v-if="deleting !== null"
    title="Delete swimmer"
    :text="`Are you sure you want to delete swimmer '${fields[deleting].value.fullName}' from your account?`"
    confirm-label="Delete"
    :action="deleteSwimmer"
  />-->
  <UI-ErrorNotification
    v-model="cancelFailed"
    title="Failed to delete"
    text="Unable to delete task."
  />
</template>
