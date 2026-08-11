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
        phone: "",
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

  const { userClubs, refresh: refreshUserClubs } = useUserClubs( userId as string )
  const { swimmers, refresh: refreshSwimmers } = useSwimmers( userId as string )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveUser = async ( values: any ) => {
    if ( user.value?.id === "0" ) {
      const created = await $fetch<{ id: string }>( `/api/user/${user.value?.id}`, {
        method: "POST",
        body: JSON.stringify( values ),
      } )
      // The route still says "0" (the new-user placeholder) — the real id only
      // exists now, so refetch with that instead of the stale placeholder.
      user.value = created?.id ? await $fetch<User>( `/api/user/${created.id}` ) : null
    } else {
      await $fetch( `/api/user/${user.value?.id}`, {
        method: "PUT",
        body: JSON.stringify( values ),
      } )
      user.value = await $fetch<User>(
        `/api/user/${userId}`
      )
    }
    // await refreshNuxtData()
    await refreshUserClubs()
    await refreshSwimmers()
  }

</script>

<template>
  <UserForm
    :user="user as User"
    :clubs="userClubs"
    :swimmers="swimmers"
    :save-fn="saveUser"
  />
</template>
