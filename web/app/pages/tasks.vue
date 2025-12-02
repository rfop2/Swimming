<script setup lang="ts">
  import { ArrowPathIcon, TrashIcon } from "@heroicons/vue/24/outline"
  import type { FetchError } from "ofetch"
  import { ucFirst, type Task } from "lib"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Tasks",
    meta: [
      { name: "description", content: "View and manage update tasks" }
    ]
  } )

  const user = useAuthenticatedUser()

  const { formatTemporal } = useTemporal()

  const statusOptions = [
    {
      label: "Queued",
      value: "pending",
    },
    {
      label: "Running",
      value: "progress",
    },
    {
      label: "Completed",
      value: "complete",
    },
    {
      label: "Failed",
      value: "error",
    },
  ]

  const { state: selections } = usePersisted( "tasks-selection", {
    status: statusOptions.map( o => o.value ),
    owned: false,
  }, "reactive" )

  const { tasks, fetchTasks, updateTask, deleteTask } = useTasks()

  const filteredTasks = computed( () => ( tasks.value || [] ).filter( task => {
    if ( selections.status.length > 0 && !selections.status.includes( task.taskStatus! ) )
      return false
    if ( selections.owned && task.creatorId !== user.value.id )
      return false
    return true
  } ).sort( ( a, b ) => b.taskId - a.taskId ) )

  watchEffect( () => {
    console.log( "T", tasks.value )
  } )

  const formatDateTime = ( dt: string ) => {
    return formatTemporal( Temporal.PlainDateTime.from( dt ), { options: { dateStyle: "short", timeStyle: "short" } } )
  }

  const taskToUpdate = ref<Task | null>( null )
  const updateSuccess = ref( false )
  const updateFailed = ref( false )
  const updateSelectedTask = async () => {
    if ( !taskToUpdate.value )
      return
    try {
      await updateTask( { ...taskToUpdate.value,
                          taskStatus: "pending",
                          startTime: null,
                          endTime: null,
                          taskResult: "",
      } )
      updateSuccess.value = true
    } catch ( error ) {
      console.error( "Error", error )
      updateFailed.value = true
      throw createError( error as FetchError )
    } finally {
      taskToUpdate.value = null
    }
  }

  const taskToCancel = ref<Task | null>( null )
  const cancelSuccess = ref( false )
  const cancelFailed = ref( false )
  const cancelSelectedTask = async () => {
    if ( !taskToCancel.value )
      return
    try {
      await deleteTask( taskToCancel.value.taskId )
      cancelSuccess.value = true
    } catch ( error ) {
      console.error( "Error", error )
      cancelFailed.value = true
      showAlert( `Unable to cancel task: ${( error as FetchError ).message}`, "error" )
      throw createError( error as FetchError )
    } finally {
      taskToCancel.value = null
    }
  }
</script>

<template>
  <StandardPage
    title="Tasks status"
  >
    <template #description>
      View and manage pending, running and completed tasks from the last 72 hours.
    </template>
    <template #controls>
      <div class="min-w-48">
        <UI-Listbox
          v-model="selections.status"
          :options="statusOptions"
          multiple
          label="Task Status"
          placeholder="All Statuses"
        />
      </div>
      <div
        v-if="!!user.admin"
        class="min-w-24"
      >
        <UI-Input
          v-model="selections.owned"
          type="checkbox"
          label="My Tasks Only"
        />
      </div>
    </template>
    <div class="inline-block min-w-full py-2 align-left sm:px-6 lg:px-8">
      <table class="min-w-full sm:min-w-0 sm:w-3/4 divide-y divide-gray-300">
        <thead>
          <tr class="divide-x divide-gray-200">
            <th
              scope="col"
              class="whitespace-nowrap align-bottom pl-4 pr-2 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pl-0"
            >
              Task
            </th>
            <th
              v-if="!!user.admin"
              scope="col"
              class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Creator
            </th>
            <th
              scope="col"
              class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Description
            </th>
            <th
              scope="col"
              class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Type
            </th>
            <th
              scope="col"
              class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Status
            </th>
            <th
              scope="col"
              class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Added
            </th>
            <th
              scope="col"
              class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Started
            </th>
            <th
              scope="col"
              class="whitespace-nowrap align-bottom px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Finished
            </th>
            <th
              v-if="!!user.admin"
              scope="col"
              class="whitespace-nowrap align-bottom pl-2 pr-4 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Results
            </th>
            <th
              scope="col"
              class="whitespace-nowrap align-bottom pl-2 pr-4 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              <button
                type="button"
                class="inline-flex items-center gap-x-1.5 whitespace-nowrap font-medium text-blue-700 hover:text-blue-600"
                @click="fetchTasks"
              >
                <span class="whitespace-nowrap">Reload</span>
                <ArrowPathIcon
                  class="-mr-0.5 h-4 w-4"
                  aria-hidden="true"
                />
              </button>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr
            v-for="task in filteredTasks"
            :key="task.taskId"
            class="divide-x divide-gray-200"
          >
            <td
              class="whitespace-nowrap pr-2 pl-4 py-2 text-left text-sm text-gray-900"
            >
              {{ task.taskId }}
            </td>
            <td
              v-if="!!user.admin"
              class="whitespace-nowrap px-2 py-2 text-left text-sm text-gray-900"
            >
              {{ task.creatorName }}
            </td>
            <td
              class="whitespace-wrap sm:whitespace-nowrap px-2 py-2 text-left text-sm text-gray-900"
            >
              {{ task.taskDescription }}
            </td>
            <td
              class="whitespace-wrap sm:whitespace-nowrap px-2 py-2 text-left text-sm text-gray-900"
            >
              {{ ucFirst( task.targetType ) }}
              <span v-if="task.taskOptions && JSON.parse( task.taskOptions ).updateType"> / {{ ucFirst( JSON.parse( task.taskOptions ).updateType ) }}</span>
              <span v-if="!!user.admin && task.taskOptions && JSON.parse( task.taskOptions ).force"> (Forced)</span>
            </td>
            <td
              class="whitespace-nowrap px-2 py-2 text-left text-sm text-gray-900"
            >
              {{ ucFirst( task.taskStatus! ) }}
            </td>
            <td
              class="whitespace-nowrap px-2 py-2 text-left text-sm text-gray-900"
            >
              {{ task.startTime ? formatDateTime( task.created! ) : "" }}
            </td>
            <td
              class="whitespace-nowrap px-2 py-2 text-left text-sm text-gray-900"
            >
              {{ task.startTime ? formatDateTime( task.startTime ) : "" }}
            </td>
            <td
              class="whitespace-nowrap px-2 py-2 text-left text-sm text-gray-900"
            >
              {{ task.endTime ? formatDateTime( task.endTime ) : "" }}
            </td>
            <td
              v-if="!!user.admin"
              class="whitespace-nowrap px-4 py-2 text-left text-sm text-gray-900"
            >
              {{ task.taskResult }}
            </td>
            <td
              class="whitespace-nowrap pl-2 pr-4 py-2 text-left text-sm text-gray-900"
            >
              <div class="flex gap-2 justify-end">
                <button
                  v-if="task.taskStatus === 'complete' || task.taskStatus === 'failed'"
                  type="button"
                  title="Requeue Task"
                  class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  @click="taskToUpdate = task"
                >
                  <ArrowPathIcon
                    class="size-4"
                    aria-hidden="true"
                  />
                  <span class="sr-only">Resubmit task</span>
                </button>
                <button
                  v-if="task.taskStatus === 'pending'"
                  type="button"
                  title="Cancel Task"
                  class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  @click="taskToCancel = task"
                >
                  <TrashIcon
                    class="size-4"
                    aria-hidden="true"
                  />
                  <span class="sr-only">Cancel task</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <UI-Confirm
      v-if="taskToUpdate !== null"
      title="Update Task"
      :text="`Are you sure you want to resubmit task '${taskToUpdate.taskId}'?`"
      confirm-label="Resubmit"
      :action="updateSelectedTask"
      :cancel-action="() => taskToUpdate = null"
    />
    <UI-SuccessNotification
      v-model="updateSuccess"
      title="Task resubmitted"
      text="The requested task has been re-added to the queue."
    />
    <UI-ErrorNotification
      v-model="updateFailed"
      title="Failed to resubmit task"
      text="The requested task could not be resubmitted to the queue."
    />
    <UI-Confirm
      v-if="taskToCancel !== null"
      title="Cancel Task"
      :text="`Are you sure you want to cancel task '${taskToCancel.taskId}'?`"
      confirm-label="Delete"
      :action="cancelSelectedTask"
      :cancel-action="() => taskToCancel = null"
    />
    <UI-SuccessNotification
      v-model="cancelSuccess"
      title="Task cancelled"
      text="The requested task has been cancelled."
    />
    <UI-ErrorNotification
      v-model="cancelFailed"
      title="Failed to cancel task"
      text="The requested task could not be cancelled from the queue."
    />
  </StandardPage>
</template>
