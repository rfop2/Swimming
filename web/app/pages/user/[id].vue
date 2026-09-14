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
  // Reactive (not a plain snapshot): <NuxtPage /> has no :key, so Vue Router
  // reuses this component instance when navigating between different /user/:id
  // routes rather than remounting it. Everything below that depends on the id
  // watches this so it re-fetches instead of silently keeping the previous
  // user's data on screen.
  const userId = computed( () => route.params.id as string )

  const newUserPlaceholder = ( id: string ): User => ( {
    id,
    username: "",
    firstName: "",
    lastName: "",
    phone: "",
    location: "",
    locationId: undefined,
    role: "user",
    attributes: [],
    created: undefined,
  } )

  const { data: user, refresh: refreshUser } = await useAsyncData<User | null>(
    "edit-user",
    () => userId.value === "0"
      ? Promise.resolve( newUserPlaceholder( userId.value ) )
      : $fetch<User>( `/api/user/${userId.value}` ),
    { watch: [ userId ] }
  )

  if ( !user.value ) {
    throw createError( `Can't load user '${userId.value}'` )
  }

  const { userClubs, refresh: refreshUserClubs } = useUserClubs( userId )
  const { swimmers, refresh: refreshSwimmers } = useSwimmers( userId )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveUser = async ( values: any ) => {
    if ( user.value?.id === "0" ) {
      const created = await $fetch<{ id: string }>( `/api/user/${user.value?.id}`, {
        method: "POST",
        body: JSON.stringify( values ),
      } )
      if ( created?.id ) {
        // userId watches route.params.id, so this alone triggers the user/clubs/swimmers
        // re-fetches above — no manual refresh needed once the route has changed.
        await navigateTo( `/user/${created.id}` )
        return
      }
    } else {
      await $fetch( `/api/user/${user.value?.id}`, {
        method: "PUT",
        body: JSON.stringify( values ),
      } )
      await refreshUser()
    }
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
