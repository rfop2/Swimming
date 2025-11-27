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

  const { userClubs, loading: loadingUserClubs, refresh: refreshUserClubs } = useUserClubs()
  const { swimmers, loading: loadingSwimmers, refresh: refreshSwimmers } = useSwimmers()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveUser = async ( values: any ) => {
    await $fetch( `/api/user/${user.value.id}`, {
      method: "PUT",
      body: JSON.stringify( values ),
    } )
    // await refreshNuxtData()
    await refreshUserClubs()
    await refreshSwimmers()
  }
</script>

<template>
  <UserForm
    v-if="!loadingUserClubs && !loadingSwimmers"
    :user="user"
    :clubs="userClubs"
    :swimmers="swimmers"
    :save-fn="saveUser"
  />
</template>
