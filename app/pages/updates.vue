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

  const { swimmers } = useSwimmers( user.value.id )

  const { data: tasks } = await useFetch<Task[]>(
    "/api/tasks",
    {
      key: "tasks",
    }
  )
</script>

<template>
  <UpdatesForm
    :user="user"
    :swimmers="swimmers"
    :tasks="tasks ?? []"
  />
</template>
