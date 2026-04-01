<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from "@headlessui/vue"
  import { ArrowRightEndOnRectangleIcon, CreditCardIcon, GiftIcon, PencilSquareIcon, TrashIcon, UserPlusIcon } from "@heroicons/vue/24/outline"
  import { format, differenceInDays } from "date-fns"
  import type { User } from "lucia"
  import { ucFirst } from "lib"

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

  type UsersApiResponse = InternalApi["/api/users"]["get"]

  const { data: users, refresh: refreshUsers } = await useFetch(
    "/api/users",
    {
      key: "user-data",
      transform( data: UsersApiResponse ): UsersApiResponse {
        data.sort( ( a, b ) => {
          const typeDiff = a.type.localeCompare( b.type )
          if ( typeDiff ) return typeDiff
          const lastNameDiff = a.lastName.localeCompare( b.lastName )
          if ( lastNameDiff ) return lastNameDiff
          const firstNameDiff = a.firstName.localeCompare( b.firstName )
          if ( firstNameDiff ) return firstNameDiff
          return 0
        } )
        return data
      }
    }
  )

  const userTypes = computed( () => ( users.value ?? [] ).reduce( ( types, user ) => {
    types.add( user.type )
    return types
  }, new Set<string>() ) )
  const typeOptions = computed( () => Array.from( userTypes.value ).sort().map( type => ( { label: ucFirst( type ), value: type } ) ) )

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
    if ( user ) {
      console.log( "Impersonate", user )
      if ( user.id !== currentUser.value.id ) {
        await impersonate( user.id )
      }
      navigateTo( "/account" )
    }
  }

  const editUser = ( userIndex: number ) => {
    if ( !users.value )
      return
    const user = filteredUsers.value[userIndex]
    if ( user ) {
      console.log( "Edit", user )
      if ( user.id === currentUser.value.id ) {
        navigateTo( "/account" )
      } else {
        navigateTo( `/user/${user.id}` )
      }
    }
  }

  const deleting = ref<number | null>( null )

  const deleteUser = async () => {
    if ( !users.value )
      return
    if ( deleting.value !== null ) {
      const userToDelete = filteredUsers.value[deleting.value]
      if ( userToDelete ) {
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
  }

  const { data: tiers } = await useFetch( "/api/billing/tiers" )
  const paidTiers = computed( () => tiers.value?.filter( t => t.id !== "free" ) ?? [] )

  const grantingSubscription = ref<number | null>( null )
  const grantTier = ref( "" )
  const grantMonths = ref( 12 )

  const openGrantSubscription = ( userIndex: number ) => {
    grantTier.value = paidTiers.value[0]?.id ?? ""
    grantMonths.value = 12
    grantingSubscription.value = userIndex
  }

  const grantSubscription = async () => {
    if ( grantingSubscription.value === null ) return
    const targetUser = filteredUsers.value[grantingSubscription.value]
    if ( !targetUser ) return

    await $fetch( "/api/admin/subscription", {
      method: "POST",
      body: { userId: targetUser.id, tier: grantTier.value, months: grantMonths.value }
    } )
    await refreshUsers()
    grantingSubscription.value = null
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
                Phone
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
                Subscription
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
                Created
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
                {{ user.phone }}
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap max-w-36 overflow-hidden text-ellipsis text-gray-500" :title="user.location">
                {{ user.location }}
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                {{ ucFirst( user.type ) }}
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                <span class="inline-flex items-center gap-1">
                  <CreditCardIcon
                    v-if="user.subscriptionSource === 'gocardless'"
                    class="size-4 text-indigo-500 shrink-0"
                    title="Paid subscription"
                  />
                  <GiftIcon
                    v-else-if="user.subscriptionSource === 'manual'"
                    class="size-4 text-green-600 shrink-0"
                    title="Manual / gifted subscription"
                  />
                  {{ user.subscriptionTier }}
                  <span
                    v-if="user.subscriptionPeriodEnd"
                    class="text-xs text-gray-400"
                  >
                    ({{ differenceInDays( new Date( user.subscriptionPeriodEnd as string ), new Date() ) }}d)
                  </span>
                </span>
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap max-w-36 overflow-hidden text-ellipsis text-gray-500" :title="user.clubs">
                {{ user.clubs }}
              </td>
              <td class="px-1 py-2 text-sm text-right whitespace-nowrap text-gray-500">
                {{ user.swimmerCount }}
              </td>
              <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                {{ user.created ? format( user.created as string, "dd/MM/yyyy" ) : "" }}
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
                    class="inline-flex items-center gap-x-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                    :title="`Grant subscription to ${user.username}`"
                    @click="() => openGrantSubscription( userIndex )"
                  >
                    <GiftIcon
                      class="-ml-0.5 size-5"
                      aria-hidden="true"
                    />
                    <span class="sr-only">Grant subscription, {{ user.username }}</span>
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
      :text="`Are you sure you want to delete user '${(filteredUsers as User[])[deleting]?.username}' from the site?`"
      confirm-label="Delete"
      :action="deleteUser"
    />
    <TransitionRoot
      as="template"
      :show="grantingSubscription !== null"
    >
      <Dialog
        class="relative z-10"
        @close="grantingSubscription = null"
      >
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as="template"
              enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                <DialogTitle
                  as="h3"
                  class="text-base font-semibold text-gray-900 mb-4"
                >
                  Grant manual subscription
                </DialogTitle>
                <p class="text-sm text-gray-600 mb-4">
                  Grant a manual subscription to
                  <strong>{{ grantingSubscription !== null ? filteredUsers[grantingSubscription]?.username : "" }}</strong>.
                  This will replace any existing subscription.
                </p>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                    <select
                      v-model="grantTier"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option
                        v-for="tier in paidTiers"
                        :key="tier.id"
                        :value="tier.id"
                      >
                        {{ tier.name }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Duration (months)</label>
                    <input
                      v-model.number="grantMonths"
                      type="number"
                      min="1"
                      max="120"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                  </div>
                </div>
                <div class="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
                  <button
                    type="button"
                    class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:w-auto"
                    @click="grantSubscription"
                  >
                    Grant
                  </button>
                  <button
                    type="button"
                    class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    @click="grantingSubscription = null"
                  >
                    Cancel
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </StandardPage>
</template>
