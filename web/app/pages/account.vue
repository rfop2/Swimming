<script setup lang="ts">
  import type { User } from "lucia"

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
    user.value = await useRequestFetch()<User>( "/api/user/current" )
    await refreshUserClubs()
    await refreshSwimmers()
  }
</script>

<template>
  <div>
    <UserForm
      :user="user!"
      :clubs="userClubs"
      :swimmers="swimmers"
      :save-fn="saveUser"
    />
    <div class="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
      <SubscriptionPanel />
    </div>
  </div>
</template>
