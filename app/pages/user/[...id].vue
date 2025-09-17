<script setup lang="ts">
  definePageMeta( {
    layout: "secure",
    middleware: [ "admin" ]
  } )

  useHead( {
    title: "User",
    meta: [
      { name: "description", content: "Edit user details" }
    ]
  } )

  const route = useRoute()
  const userId = route.params.id
</script>

<template>
  <UserForm
    :user-id="userId"
  />
</template>
