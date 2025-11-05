<script setup lang="ts">
  import { ArrowRightEndOnRectangleIcon, PencilSquareIcon, TrashIcon, UserPlusIcon } from "@heroicons/vue/24/outline"
  import { format } from "date-fns"
  import type { User } from "lucia"

  definePageMeta( {
    layout: "secure",
    middleware: [ "admin" ]
  } )

  useHead( {
    title: "Users",
    meta: [
      { name: "description", content: "Manage site users" }
    ]
  } )

  const currentUser = useAuthenticatedUser()

  const { data: users, refresh: refreshUsers } = await useFetch(
    "/api/users"
  )

  const userTypes = computed( () => ( users.value ?? [] ).reduce( ( types, user ) => {
    types.add( user.type )
    return types
  }, new Set<string>() ) )
  const typeOptions = computed( () => Array.from( userTypes.value ).sort().map( type => ( { label: `${type.charAt( 0 ).toUpperCase()}${type.slice( 1 )}`, value: type } ) ) )

  const { state: selections } = usePersisted( "users-selection", {
    type: typeOptions.value.filter( option => option.value !== "other" ).map( ( { value } ) => ( value ) ),
  }, "reactive" )

  const selectedTypes = computed( {
    get: () => typeOptions.value.map( o => o.value ).filter( v => selections.type.includes( v ) ),
    set: ( newTypes ) => selections.type = newTypes
  } )

  const filteredUsers = computed( () => ( users.value ?? [] ).filter( user => {
    if ( selections.type.length === 0 || !selections.type.includes( user.type ) )
      return false
    return true
  } ) )

  const { impersonate } = useImpersonation()

  const addUser = () => {
    navigateTo( "/user/0" )
  }

  const impersonateUser = async ( userIndex: number ) => {
    if ( !users.value )
      return
    const user = filteredUsers.value[userIndex]
    console.log( "Impersonate", user )
    if ( user.id !== currentUser.value.id ) {
      await impersonate( user.id )
    }
    navigateTo( "/account" )
  }

  const editUser = ( userIndex: number ) => {
    if ( !users.value )
      return
    const user = filteredUsers.value[userIndex]
    console.log( "Edit", user )
    if ( user.id === currentUser.value.id ) {
      navigateTo( "/account" )
    } else {
      navigateTo( `/user/${user.id}` )
    }
  }

  const deleting = ref<number | null>( null )

  const deleteUser = async () => {
    if ( !users.value )
      return
    if ( deleting.value !== null ) {
      const userToDelete = filteredUsers.value[deleting.value]
      console.log( "Delete", userToDelete )
      await $fetch(
        `/api/user/${userToDelete.id}`,
        {
          method: "DELETE"
        }
      )
      await refreshUsers()
    }
    deleting.value = null
  }
</script>

<template>
  <StandardPage
    title="Users"
  >
    <template #description>
      Registered site users.
    </template>
    <template #controls>
      <div class="min-w-64">
        <UI-Listbox
          v-model="selectedTypes"
          :options="typeOptions"
          label="User Types"
          placeholder="All Types"
          multiple
        />
      </div>
    </template>
    <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <table class="relative min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th
                class="py-3.5 pr-1 pl-2 text-left text-sm font-semibold text-gray-900 sm:pl-0"
              >
                First Name
              </th>
              <th
                scope="col"
                class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Last Name
              </th>
              <th
                scope="col"
                class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Email
              </th>
              <th
                scope="col"
                class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Location
              </th>
              <th
                scope="col"
                class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Type
              </th>
              <th
                scope="col"
                class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Club (*owner)
              </th>
              <th
                scope="col"
                class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Swimmers
              </th>
              <th
                scope="col"
                class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                Last Login
              </th>
              <th
                scope="col"
                class="py-1.5 pr-2 pl-1 sm:pr-0"
              >
                <button
                  type="button"
                  class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  @click="addUser"
                >
                  <UserPlusIcon
                    class="-ml-0.5 size-5"
                    aria-hidden="true"
                  />
                  Add
                </button>
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="(user, userIndex) in filteredUsers"
              :key="user.id"
            >
              <td class="py-1 pr-1 pl-2 text-sm font-medium whitespace-nowrap text-gray-500 sm:pl-0">
                {{ user.firstName }}
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                {{ user.lastName }}
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                {{ !!Number( user.admin ) ? "*" : "" }}{{ user.username }}
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                {{ user.location }}
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                {{ `${user.type.charAt( 0 ).toUpperCase()}${user.type.slice( 1 )}` }}
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                {{ user.clubs }}
              </td>
              <td class="px-1 py-2 text-sm text-right whitespace-nowrap text-gray-500">
                {{ user.swimmerCount }}
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                {{ user.lastLogin ? `${format( user.lastLogin as string, "dd/MM/yyyy" )} (${user.loginCount})` : "" }}
              </td>
              <td class="py-2 pr-2 pl-1 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                <div class="flex gap-2 justify-end">
                  <button
                    type="button"
                    class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600  disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    :disabled="currentUser.id === user.id"
                    @click="() => impersonateUser( userIndex )"
                  >
                    <ArrowRightEndOnRectangleIcon
                      class="-ml-0.5 size-5"
                      aria-hidden="true"
                    />
                    <span class="sr-only">Impersonate, {{ user.username }}</span>
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600  disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    @click="() => editUser( userIndex )"
                  >
                    <PencilSquareIcon
                      class="-ml-0.5 size-5"
                      aria-hidden="true"
                    />
                    <span class="sr-only">Edit, {{ user.username }}</span>
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-x-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    :disabled="currentUser.id === user.id"
                    @click="() => { deleting = userIndex }"
                  >
                    <TrashIcon
                      class="-ml-0.5 size-5"
                      aria-hidden="true"
                    />
                    <span class="sr-only">Delete, {{ user.username }}</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <UI-Confirm
      v-if="deleting !== null"
      title="Delete user"
      :text="`Are you sure you want to delete user '${(filteredUsers as User[])[deleting].username}' from the site?`"
      confirm-label="Delete"
      :action="deleteUser"
    />
  </StandardPage>
</template>
