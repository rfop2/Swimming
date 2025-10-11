<script setup lang="ts">
  import type { Task } from "lib"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Updates",
    meta: [
      { name: "description", content: "Swimmer updates and other tasks" }
    ]
  } )

  const user = useAuthenticatedUser()

  const { swimmers, refresh: refreshSwimmers } = useSwimmers( user.value.id )
  watchEffect( () => {
    console.log( swimmers.value )
  } )

  const { data: tasks } = await useFetch<Task[]>(
    "/api/tasks",
    {
      key: "tasks",
    }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveTasks = async ( values: any ) => {
    await $fetch( `/api/tasks/${user.value.id}`, {
      method: "PUT",
      body: JSON.stringify( values ),
    } )
    // await refreshSwimmers()
  }
</script>

<template>
  <UpdatesForm
    :user="user"
    :swimmers="swimmers"
    :tasks="tasks ?? []"
    :save-fn="saveTasks"
    :reload-fn="refreshSwimmers"
  />
</template>
