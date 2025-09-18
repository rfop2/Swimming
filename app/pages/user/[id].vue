<script setup lang="ts">
  import type { User } from "lucia"

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

  const user = await ( async () => {
    if ( userId === "0" ) {
      const user = ref<User | null>( {
        id: "0",
        username: "",
        firstName: "",
        lastName: "",
        location: "",
        type: "",
        admin: false
      } as User )
      return Promise.resolve( user )
    } else {
      const { data: user } = await useFetch<User>(
        `/api/user/${userId}`
      )
      return user
    }
  } )()

  if ( !user.value ) {
    throw createError( `Can't load user '${userId}'` )
  }
  const { swimmers, refreshSwimmers } = await useSwimmers( userId as string )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveUser = async ( values: any ) => {
    if ( user.value?.id === "0" ) {
      await $fetch( `/api/user/${user.value?.id}`, {
        method: "POST",
        body: JSON.stringify( values ),
      } )
    } else {
      await $fetch( `/api/user/${user.value?.id}`, {
        method: "PUT",
        body: JSON.stringify( values ),
      } )
    }
    // await refreshNuxtData()
    await refreshSwimmers()
  }

</script>

<template>
  <UserForm
    :user="user as User"
    :swimmers="swimmers"
    :save-fn="saveUser"
  />
</template>
