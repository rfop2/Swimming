<script setup lang="ts">
  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Account",
    meta: [
      { name: "description", content: "Edit account details and manage swimmers" }
    ]
  } )

  const user = useAuthenticatedUser()

  const { swimmers, refresh: refreshSwimmers } = useSwimmers( user.value.id )
  watchEffect( () => {
    console.log( swimmers.value )
  } )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveUpdates = async ( values: any ) => {
    await $fetch( `/api/user/${user.value.id}`, {
      method: "PUT",
      body: JSON.stringify( values ),
    } )
    // await refreshNuxtData()
    await refreshSwimmers()
  }
</script>

<template>
  <UpdatesForm
    :user="user"
    :swimmers="swimmers"
    :save-fn="saveUpdates"
    :reload-fn="refreshSwimmers"
  />
</template>
