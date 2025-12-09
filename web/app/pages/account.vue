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

  const user = useUser()

  const { userClubs, refresh: refreshUserClubs } = useUserClubs()
  const { swimmers, refresh: refreshSwimmers } = useSwimmers()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveUser = async ( values: any ) => {
    await $fetch( `/api/user/${user.value?.id}`, {
      method: "PUT",
      body: JSON.stringify( values ),
    } )
    // await refreshNuxtData()
    user.value = await useRequestFetch()( "/api/user/current" )
    await refreshUserClubs()
    await refreshSwimmers()
  }
</script>

<template>
  <UserForm
    :user="user!"
    :clubs="userClubs"
    :swimmers="swimmers"
    :save-fn="saveUser"
  />
</template>
