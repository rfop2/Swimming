<script setup lang="ts">
  import { CheckIcon, PencilSquareIcon, TrashIcon, UserPlusIcon } from "@heroicons/vue/24/outline"
  import { format } from "date-fns"

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

  const { data: users } = await useFetch(
    "/api/users"
  )

  const addUser = () => {
    navigateTo( "/user/0" )
  }

  const editUser = ( userIndex: number ) => {
    if ( !users.value )
      return
    const user = users.value[userIndex]
    console.log( "Edit", user )
    if ( user.id === currentUser.value.id ) {
      navigateTo( "/account" )
    } else {
      navigateTo( `/user/${user.id}` )
    }
  }

  const deleting = ref<number | null>( null )

  const deleteUser = () => {
    if ( !users.value )
      return
    if ( deleting.value !== null ) {
      // remove( deleting.value )
      console.log( "Delete", users.value[deleting.value] )
    }
    deleting.value = null
  }
</script>

<template>
  <div>
    <div class="border-b border-gray-900/10 pt-8 pb-12">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="sm:flex sm:items-center">
          <div class="sm:flex-auto">
            <h1 class="text-base font-semibold text-gray-900">
              Users
            </h1>
            <p class="mt-2 text-sm text-gray-700">
              Registered site users.
            </p>
          </div>
          <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <UserPlusIcon
                class="-ml-0.5 size-5"
                aria-hidden="true"
                @click="addUser"
              />
              Add user
            </button>
          </div>
        </div>
        <div class="mt-8 flow-root">
          <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table class="relative min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      class="py-3.5 pr-1 pl-2 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                    >
                      Id
                    </th>
                    <th
                      scope="col"
                      class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
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
                      Created
                    </th>
                    <th
                      scope="col"
                      class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Admin
                    </th>
                    <th
                      scope="col"
                      class="py-1.5 pr-2 pl-1 sm:pr-0"
                    >
                      <span class="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr
                    v-for="(user, userIndex) in users"
                    :key="user.id"
                  >
                    <td class="py-1 pr-1 pl-2 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0">
                      {{ user.id }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ user.firstName }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ user.lastName }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ user.username }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ user.location }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ user.type }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ format( user.created, "dd/MM/yyyy" ) }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      <CheckIcon
                        v-if="!!user.admin"
                        class="block h-6 w-6"
                      />
                    </td>
                    <td class="py-2 pr-2 pl-1 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                      <div class="flex gap-2 justify-end">
                        <button
                          type="button"
                          class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
        </div>

        <UI-Confirm
          v-if="deleting !== null"
          title="Delete user"
          :text="`Are you sure you want to delete user '${users[deleting].username}' from the site?`"
          confirm-label="Delete"
          :action="deleteUser"
        />
      </div>
    </div>
  </div>
</template>
