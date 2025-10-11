<script setup lang="ts">
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
</script>

<template>
  <UpdatesForm
    :user="user"
    :swimmers="swimmers"
  />
</template>
