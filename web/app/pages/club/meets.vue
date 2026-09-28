<script setup lang="ts">
  import { PencilSquareIcon, PlusCircleIcon, XCircleIcon } from "@heroicons/vue/24/outline"
  import type { FetchError } from "ofetch"
  import type { InternalApi } from "nitropack"
  import { Temporal } from "temporal-polyfill"
  import type { Club, PoolRecord } from "lib"
  import StandardPage from "~/components/StandardPage.vue"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected", "club-admin" ]
  } )

  useHead( {
    title: "Club Meets",
    meta: [
      { name: "description", content: "Manage details of your club's upcoming meets" }
    ]
  } )

  type ClubAdminMeet = InternalApi["/api/clubs/:id/meets"]["get"][number]
  type PoolSummary = Pick<PoolRecord, "poolId" | "poolName" | "poolTown" | "poolPostCode">

  const user = useAuthenticatedUser()
  const isAdmin = user.value.role === "admin"

  // --- Club selection ---
  const { userClubs } = useUserClubs()
  const ownedClubOptions = computed<UISelection[]>( () => userClubs.value
    .filter( c => c.clubOwner )
    .map( c => ( { label: c.clubName, value: c.clubId } ) ) )

  // Site admins can manage any club's meets, so they can search for one
  const searchedClubOptions = ref<UISelection[]>( [] )
  const clubOptions = computed( () => [
    ...ownedClubOptions.value,
    ...searchedClubOptions.value.filter( s => !ownedClubOptions.value.some( o => o.value === s.value ) ),
  ] )
  const searchClubs = async ( query: string ): Promise<UISelection[]> => {
    if ( !query ) return clubOptions.value
    const res = await $fetch<Club[]>( `/api/clubs/search?search=${encodeURIComponent( query )}` )
    const found = res.map( c => ( { label: c.clubName, value: c.clubId } ) )
    searchedClubOptions.value = found
    return found
  }

  const clubId = ref<string | undefined>()
  watch( ownedClubOptions, ( options ) => {
    if ( !clubId.value && options[0] ) clubId.value = String( options[0].value )
  }, { immediate: true } )

  const clubName = computed( () => clubOptions.value.find( c => c.value === clubId.value )?.label )

  // --- Meets ---
  const { data: meets, pending, refresh } = await useFetch<ClubAdminMeet[]>(
    () => `/api/clubs/${clubId.value}/meets`,
    {
      key: "club-admin-meets",
      default: () => [],
      immediate: !!clubId.value,
      watch: [ clubId ],
    }
  )

  const { formatTemporal } = useTemporal()
  const formatDate = ( date: string ) => formatTemporal( Temporal.PlainDate.from( date.slice( 0, 10 ) ), { options: { weekday: "short", day: "numeric", month: "short", year: "numeric" } } )
  const poolLabel = ( p: Pick<PoolSummary, "poolName" | "poolTown"> ) => p.poolTown?.trim() ? `${p.poolName.trim()}, ${p.poolTown.trim()}` : p.poolName.trim()
  const packUrl = ( meetPack: string ) => `/downloads/meets/${encodeURIComponent( meetPack )}`

  // --- Editing ---
  const editingMeet = ref<ClubAdminMeet | null>( null )
  const showEditor = ref( false )
  const editPoolId = ref<number | undefined>()
  const editMeetInfo = ref( "" )
  const editRemovePack = ref( false )
  const editPackFile = ref<File | null>( null )
  const packInput = ref<HTMLInputElement | null>( null )

  // The combobox only shows labels for values in its options, so keep the selected pool in there
  const poolOptions = ref<UISelection[]>( [] )
  const toPoolOption = ( p: PoolSummary ): UISelection => ( { label: poolLabel( p ), value: p.poolId } )
  const searchPools = async ( query: string ): Promise<UISelection[]> => {
    if ( !query ) return poolOptions.value
    const res = await $fetch<PoolSummary[]>( `/api/pools/search?search=${encodeURIComponent( query )}` )
    const found = res.map( toPoolOption )
    const selected = poolOptions.value.find( o => o.value === editPoolId.value )
    poolOptions.value = selected && !found.some( o => o.value === selected.value ) ? [ selected, ...found ] : found
    return found
  }

  const editMeet = ( meet: ClubAdminMeet ) => {
    editingMeet.value = meet
    editPoolId.value = meet.poolId ?? undefined
    editMeetInfo.value = meet.meetInfo ?? ""
    editRemovePack.value = false
    editPackFile.value = null
    poolOptions.value = meet.poolId && meet.poolName
      ? [ toPoolOption( { poolId: meet.poolId, poolName: meet.poolName, poolTown: meet.poolTown ?? "", poolPostCode: meet.poolPostCode ?? "" } ) ]
      : []
    showEditor.value = true
  }

  const onPackSelected = ( event: Event ) => {
    const input = event.target as HTMLInputElement
    editPackFile.value = input.files?.[0] ?? null
    if ( editPackFile.value ) editRemovePack.value = false
  }

  const clearPackSelection = () => {
    editPackFile.value = null
    if ( packInput.value ) packInput.value.value = ""
  }

  const saving = ref( false )
  const saveSuccess = ref( false )
  const saveError = ref( false )
  const saveErrorText = ref( "" )

  // UI-Dialog closes as soon as the action is called, so the save completes in the background
  const saveMeet = async () => {
    const meet = editingMeet.value
    if ( !meet ) return
    saving.value = true
    try {
      if ( editPackFile.value ) {
        const form = new FormData()
        form.append( "pack", editPackFile.value )
        await $fetch( `/api/meets/${meet.id}/pack`, { method: "POST", body: form } )
      }
      await $fetch( `/api/meets/${meet.id}/meta`, {
        method: "PUT",
        body: {
          poolId: editPoolId.value ?? null,
          meetInfo: editMeetInfo.value,
          ...( editRemovePack.value && !editPackFile.value ? { meetPack: null } : {} ),
        },
      } )
      saveSuccess.value = true
    } catch ( error ) {
      console.error( "Error", error )
      const fetchError = error as FetchError
      saveErrorText.value = fetchError.data?.message ?? fetchError.message ?? "Unable to save changes."
      saveError.value = true
    } finally {
      saving.value = false
      editingMeet.value = null
      await refresh()
    }
  }

  const cancelEdit = () => {
    editingMeet.value = null
  }

  // --- Claiming meets the club matcher missed ---
  type UnclaimedMeet = InternalApi["/api/clubs/:id/unclaimed-meets"]["get"][number]

  const showClaim = ref( false )
  const claimMeetId = ref<string | undefined>()
  const claimOptions = ref<UISelection[]>( [] )
  const searchUnclaimed = async ( query: string ): Promise<UISelection[]> => {
    if ( !query || !clubId.value ) return claimOptions.value
    const res = await $fetch<UnclaimedMeet[]>( `/api/clubs/${clubId.value}/unclaimed-meets?search=${encodeURIComponent( query )}` )
    const found = res.map( m => ( { label: `${formatDate( m.date )} – ${m.name} (${m.location})`, value: m.id } ) )
    const selected = claimOptions.value.find( o => o.value === claimMeetId.value )
    claimOptions.value = selected && !found.some( o => o.value === selected.value ) ? [ selected, ...found ] : found
    return found
  }

  const openClaim = () => {
    claimMeetId.value = undefined
    claimOptions.value = []
    showClaim.value = true
  }

  const claimSuccess = ref( false )

  // --- Releasing meets wrongly linked to the club ---
  const releasingMeet = ref<ClubAdminMeet | null>( null )
  const releaseSuccess = ref( false )

  const releaseMeet = async () => {
    const meet = releasingMeet.value
    releasingMeet.value = null
    if ( !meet ) return
    saving.value = true
    try {
      await $fetch( `/api/meets/${meet.id}/claim`, { method: "DELETE" } )
      releaseSuccess.value = true
    } catch ( error ) {
      console.error( "Error", error )
      const fetchError = error as FetchError
      saveErrorText.value = fetchError.data?.message ?? fetchError.message ?? "Unable to release meet."
      saveError.value = true
    } finally {
      saving.value = false
      await refresh()
    }
  }

  const claimMeet = async () => {
    const meetId = claimMeetId.value
    if ( !meetId || !clubId.value ) return
    saving.value = true
    try {
      await $fetch( `/api/meets/${meetId}/claim`, { method: "POST", body: { clubId: clubId.value } } )
      claimSuccess.value = true
    } catch ( error ) {
      console.error( "Error", error )
      const fetchError = error as FetchError
      saveErrorText.value = fetchError.data?.message ?? fetchError.message ?? "Unable to claim meet."
      saveError.value = true
    } finally {
      saving.value = false
      await refresh()
    }
  }
</script>

<template>
  <div>
    <StandardPage title="Club Meets">
      <template #description>
        Upcoming meets for {{ clubName ?? "your club" }}. Add a meet pack, further information and the pool the meet is held at.
      </template>

      <template
        v-if="isAdmin || ownedClubOptions.length > 1"
        #controls
      >
        <div class="w-80">
          <UI-Combobox
            id="club"
            v-model="clubId"
            label="Club"
            placeholder="Select club"
            :clearable="false"
            :options="clubOptions"
            :fetch-options="isAdmin ? searchClubs : undefined"
          />
        </div>
      </template>

      <div
        v-if="clubId"
        class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-gray-700">
          Meets are matched to clubs automatically by name. If one of your club's meets is missing, you can claim it.
        </p>
        <button
          type="button"
          :disabled="saving"
          class="inline-flex shrink-0 items-center gap-x-1.5 rounded-md bg-indigo-600 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          @click="openClaim"
        >
          <PlusCircleIcon
            class="-ml-0.5 size-5"
            aria-hidden="true"
          />
          Claim meet
        </button>
      </div>

      <div class="mt-8 flow-root">
        <p
          v-if="!clubId"
          class="text-sm text-gray-500"
        >
          Select a club to see its meets.
        </p>
        <p
          v-else-if="!pending && !meets.length"
          class="text-sm text-gray-500"
        >
          There are no upcoming meets for this club. Use 'Claim meet' to add any that are missing.
        </p>
        <div
          v-else
          class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8"
        >
          <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table class="relative min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" class="py-3.5 pr-1 pl-2 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Date
                  </th>
                  <th scope="col" class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Meet
                  </th>
                  <th scope="col" class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Course
                  </th>
                  <th scope="col" class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Level
                  </th>
                  <th scope="col" class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Pool
                  </th>
                  <th scope="col" class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Info
                  </th>
                  <th scope="col" class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Meet Pack
                  </th>
                  <th scope="col" class="py-1.5 pr-2 pl-1 sm:pr-0">
                    <span class="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="meet in meets"
                  :key="meet.id"
                >
                  <td class="py-2 pr-1 pl-2 text-sm whitespace-nowrap text-gray-900 sm:pl-0">
                    {{ formatDate( meet.date ) }}<span v-if="meet.duration > 1" class="text-gray-500"> ({{ meet.duration }} days)</span>
                  </td>
                  <td class="px-1 py-2 text-sm font-medium text-gray-900">
                    {{ meet.name }}
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    {{ meet.course }}
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    {{ meet.level }}
                  </td>
                  <td class="px-1 py-2 text-sm text-gray-500">
                    {{ meet.poolName ? poolLabel( { poolName: meet.poolName, poolTown: meet.poolTown ?? "" } ) : "—" }}
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    {{ meet.meetInfo ? "✓" : "—" }}
                  </td>
                  <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                    <a
                      v-if="meet.meetPack"
                      :href="packUrl( meet.meetPack )"
                      class="underline"
                      rel="nofollow noopener"
                      target="_blank"
                    >View</a>
                    <span v-else>—</span>
                  </td>
                  <td class="py-2 pr-2 pl-1 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                    <div class="flex gap-2 justify-end">
                      <button
                        type="button"
                        :disabled="saving"
                        class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 disabled:bg-gray-300 px-2 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        @click="() => editMeet( meet )"
                      >
                        <PencilSquareIcon
                          class="size-5"
                          aria-hidden="true"
                        />
                        <span class="sr-only">Edit, {{ meet.name }}</span>
                      </button>
                      <button
                        type="button"
                        :disabled="saving"
                        :title="`Release from ${clubName ?? 'club'}`"
                        class="inline-flex items-center gap-x-1.5 rounded-md bg-red-600 disabled:bg-gray-300 px-2 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        @click="() => { releasingMeet = meet }"
                      >
                        <XCircleIcon
                          class="size-5"
                          aria-hidden="true"
                        />
                        <span class="sr-only">Release, {{ meet.name }}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StandardPage>

    <UI-Dialog
      v-model="showEditor"
      title="Edit Meet"
      confirm-label="Save"
      :action="saveMeet"
      :cancel-action="cancelEdit"
    >
      <div
        v-if="editingMeet"
        class="px-3 py-5 sm:p-4"
      >
        <p class="text-sm text-gray-700">
          {{ editingMeet.name }} &ndash; {{ formatDate( editingMeet.date ) }}
        </p>
        <div class="mt-4 grid grid-cols-1 gap-y-4">
          <UI-Combobox
            id="meet-pool"
            v-model="editPoolId"
            label="Pool"
            placeholder="Type pool name or town"
            :options="poolOptions"
            :fetch-options="searchPools"
          />
          <UI-Input
            id="meet-info"
            v-model="editMeetInfo"
            label="Meet information"
            type="textarea"
          />
          <div>
            <span class="block text-sm/6 font-medium text-gray-900">Meet pack</span>
            <div
              v-if="editingMeet.meetPack && !editRemovePack && !editPackFile"
              class="mt-1 flex items-center gap-x-3 text-sm text-gray-700"
            >
              <a
                :href="packUrl( editingMeet.meetPack )"
                class="underline truncate"
                rel="nofollow noopener"
                target="_blank"
              >{{ editingMeet.meetPack }}</a>
              <button
                type="button"
                class="text-sm font-semibold text-red-600 hover:text-red-500"
                @click="editRemovePack = true"
              >
                Remove
              </button>
            </div>
            <p
              v-if="editRemovePack"
              class="mt-1 text-sm text-gray-500"
            >
              The current meet pack will be removed when you save.
              <button
                type="button"
                class="font-semibold text-indigo-600 hover:text-indigo-500"
                @click="editRemovePack = false"
              >
                Undo
              </button>
            </p>
            <div class="mt-2 flex items-center gap-x-3">
              <input
                ref="packInput"
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                class="block text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                @change="onPackSelected"
              >
              <button
                v-if="editPackFile"
                type="button"
                class="text-sm font-semibold text-gray-600 hover:text-gray-500"
                @click="clearPackSelection"
              >
                Clear
              </button>
            </div>
            <p class="mt-1 text-xs text-gray-500">
              {{ editingMeet.meetPack ? "Choosing a file replaces the current meet pack. " : "" }}PDF, Word or image, up to 20MB.
            </p>
          </div>
        </div>
      </div>
    </UI-Dialog>

    <UI-Dialog
      v-model="showClaim"
      title="Claim Meet"
      confirm-label="Claim"
      :confirm-enabled="() => !!claimMeetId"
      :action="claimMeet"
    >
      <div class="px-3 py-5 sm:p-4">
        <p class="text-sm text-gray-700">
          Search for an upcoming meet hosted by {{ clubName ?? "your club" }}. Only meets not already linked to a club are shown.
        </p>
        <div class="mt-4">
          <UI-Combobox
            id="claim-meet"
            v-model="claimMeetId"
            label="Meet"
            placeholder="Type meet name or location"
            :options="claimOptions"
            :fetch-options="searchUnclaimed"
          />
        </div>
      </div>
    </UI-Dialog>

    <UI-Confirm
      v-if="releasingMeet"
      title="Release meet"
      :text="`Release '${releasingMeet.name}' from ${clubName ?? 'your club'}? Its pool, information and meet pack will be deleted, and it won't be linked to your club automatically again. You can claim it back later.`"
      confirm-label="Release"
      :action="releaseMeet"
      :cancel-action="() => { releasingMeet = null }"
    />

    <UI-SuccessNotification
      v-model="releaseSuccess"
      title="Meet released!"
      :text="`The meet has been removed from ${clubName ?? 'your club'}.`"
    />
    <UI-SuccessNotification
      v-model="claimSuccess"
      title="Meet claimed!"
      :text="`The meet has been added to ${clubName ?? 'your club'}.`"
    />
    <UI-SuccessNotification
      v-model="saveSuccess"
      title="Successfully saved!"
      text="Meet details have been updated."
    />
    <UI-ErrorNotification
      v-model="saveError"
      title="Unable to save"
      :text="saveErrorText"
    />
  </div>
</template>
