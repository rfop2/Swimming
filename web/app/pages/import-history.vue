<script setup lang="ts">
  import { ArrowPathIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/vue/24/outline"

  definePageMeta( {
    layout: "secure",
    middleware: [ "admin" ],
    maxWidth: "max-w-screen-2xl",
  } )

  useHead( {
    title: "Import History",
    meta: [ { name: "description", content: "Review and roll back qualifying time imports" } ],
  } )

  type ImportStatus = "pending" | "completed" | "failed" | "rolled_back"

  interface ImportHistoryRow {
    id: number
    filename: string
    layoutId: string | null
    layoutName: string | null
    year: number
    scope: string
    area: string
    type: string
    course: string
    qualifyingStart: string | null
    qualifyingEnd: string | null
    lastRaceDate: string | null
    importedByName: string
    status: ImportStatus
    totalCount: number
    insertedCount: number
    updatedCount: number
    errorMessage: string | null
    created: string
    rolledBackAt: string | null
    rolledBackByName: string | null
  }

  interface TimeChange {
    id: number
    operation: "insert" | "update"
    course: string
    gender: string
    stroke: string
    distance: string
    age: string
    previousTimeString: string | null
    importedTimeString: string
  }

  interface ImportDetail {
    import: ImportHistoryRow
    periodChange: Record<string, unknown> | null
    timeChanges: TimeChange[]
  }

  const { data: imports, status, refresh } = await useFetch<ImportHistoryRow[]>( "/api/import/history" )
  const search = ref( "" )
  const statusFilter = ref<ImportStatus | "all">( "all" )
  const yearFilter = ref<number | "all">( "all" )
  const expandedId = ref<number | null>( null )
  const detail = ref<ImportDetail | null>( null )
  const detailLoading = ref( false )
  const rollbackId = ref<number | null>( null )
  const feedback = ref<{ type: "success" | "error", message: string } | null>( null )

  const years = computed( () => [ ...new Set( ( imports.value ?? [] ).map( item => item.year ) ) ].sort( ( a, b ) => b - a ) )
  const filteredImports = computed( () => {
    const query = search.value.trim().toLowerCase()
    return ( imports.value ?? [] ).filter( item => {
      if ( statusFilter.value !== "all" && item.status !== statusFilter.value ) return false
      if ( yearFilter.value !== "all" && item.year !== yearFilter.value ) return false
      if ( !query ) return true
      return [ item.filename, item.layoutName, item.area, item.importedByName ]
        .some( value => value?.toLowerCase().includes( query ) )
    } )
  } )

  const formatDateTime = ( value: string | null ) => value
    ? new Intl.DateTimeFormat( "en-GB", { dateStyle: "medium", timeStyle: "short" } ).format( new Date( value ) )
    : "—"
  const formatDate = ( value: string | null ) => value
    ? new Intl.DateTimeFormat( "en-GB", { dateStyle: "medium", timeZone: "UTC" } ).format( new Date( `${value}T00:00:00Z` ) )
    : "—"
  const courseLabel = ( course: string ) => ( { lc: "Long", sc: "Short", both: "Both" }[course] ?? course )
  const statusLabel = ( value: ImportStatus ) => ( {
    pending: "Pending",
    completed: "Completed",
    failed: "Failed",
    rolled_back: "Rolled back",
  }[value] )
  const statusClass = ( value: ImportStatus ) => ( {
    pending: "bg-amber-100 text-amber-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    rolled_back: "bg-gray-100 text-gray-700",
  }[value] )

  async function toggleDetails( item: ImportHistoryRow ) {
    if ( expandedId.value === item.id ) {
      expandedId.value = null
      detail.value = null
      return
    }
    expandedId.value = item.id
    detail.value = null
    detailLoading.value = true
    try {
      detail.value = await $fetch<ImportDetail>( `/api/import/history/${item.id}` )
    } catch ( error ) {
      feedback.value = { type: "error", message: ( error as Error ).message || "Unable to load import details." }
    } finally {
      detailLoading.value = false
    }
  }

  async function rollbackImport( item: ImportHistoryRow ) {
    const message = `Roll back import #${item.id} (${item.filename})?\n\nThis will delete ${item.insertedCount} inserted values, restore ${item.updatedCount} previous values, and restore the previous qualification dates.`
    if ( !window.confirm( message ) ) return

    rollbackId.value = item.id
    feedback.value = null
    try {
      const result = await $fetch<{ deletedCount: number, restoredCount: number }>( `/api/import/history/${item.id}/rollback`, { method: "POST" } )
      feedback.value = {
        type: "success",
        message: `Import #${item.id} was rolled back. ${result.deletedCount} inserted values were deleted and ${result.restoredCount} previous values were restored.`,
      }
      expandedId.value = null
      detail.value = null
      await refresh()
    } catch ( error ) {
      const serverMessage = ( error as { data?: { message?: string }, message?: string } )?.data?.message || ( error as Error ).message
      feedback.value = { type: "error", message: serverMessage || "Unable to roll back this import." }
    } finally {
      rollbackId.value = null
    }
  }
</script>

<template>
  <StandardPage title="Import History">
    <template #description>
      Review qualifying-time imports, inspect the values they changed, and roll back completed imports.
    </template>

    <template #controls>
      <input
        v-model="search"
        type="search"
        placeholder="Search filename, layout, area or user"
        class="w-full rounded-md border-gray-300 text-sm sm:w-80"
      >
      <select v-model="yearFilter" class="rounded-md border-gray-300 text-sm">
        <option value="all">All years</option>
        <option v-for="year in years" :key="year" :value="year">
          {{ year }}
        </option>
      </select>
      <select v-model="statusFilter" class="rounded-md border-gray-300 text-sm">
        <option value="all">All statuses</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
        <option value="rolled_back">Rolled back</option>
        <option value="pending">Pending</option>
      </select>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        @click="refresh"
      >
        <ArrowPathIcon class="h-4 w-4" /> Refresh
      </button>
    </template>

    <div
      v-if="feedback"
      class="mb-4 rounded-md border p-3 text-sm"
      :class="feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'"
    >
      {{ feedback.message }}
    </div>

    <div v-if="status === 'pending'" class="py-12 text-center text-sm text-gray-500">
      Loading import history…
    </div>
    <div v-else-if="!filteredImports.length" class="rounded-lg border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
      No imports match these filters. Only imports saved after audit history was enabled will appear here.
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="item in filteredImports"
        :key="item.id"
        class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
      >
        <div class="grid gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] lg:items-center">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate font-semibold text-gray-900">{{ item.filename }}</p>
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusClass(item.status)">
                {{ statusLabel(item.status) }}
              </span>
            </div>
            <p class="mt-1 text-xs text-gray-500">
              Import #{{ item.id }} · {{ formatDateTime(item.created) }} · {{ item.importedByName }}
            </p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500">Details</p>
            <p class="mt-1 text-sm text-gray-900">{{ item.year }} · {{ item.scope }} · {{ item.area }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500">Type / Course</p>
            <p class="mt-1 text-sm capitalize text-gray-900">{{ item.type }} · {{ courseLabel(item.course) }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500">Values</p>
            <p class="mt-1 text-sm text-gray-900">{{ item.totalCount }} total</p>
            <p class="text-xs text-gray-500">{{ item.insertedCount }} inserted · {{ item.updatedCount }} updated</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500">Qualifying dates</p>
            <p class="mt-1 text-xs text-gray-700">{{ formatDate(item.qualifyingStart) }} – {{ formatDate(item.qualifyingEnd) }}</p>
          </div>
          <div class="flex gap-2 lg:justify-end">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="toggleDetails(item)"
            >
              {{ expandedId === item.id ? "Hide" : "View" }}
              <ChevronUpIcon v-if="expandedId === item.id" class="h-4 w-4" />
              <ChevronDownIcon v-else class="h-4 w-4" />
            </button>
            <button
              v-if="item.status === 'completed'"
              type="button"
              class="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="rollbackId === item.id"
              @click="rollbackImport(item)"
            >
              {{ rollbackId === item.id ? "Rolling back…" : "Rollback" }}
            </button>
          </div>
        </div>

        <div v-if="expandedId === item.id" class="border-t border-gray-200 bg-gray-50 p-4">
          <p v-if="detailLoading" class="text-sm text-gray-500">Loading changes…</p>
          <div v-else-if="detail" class="space-y-4">
            <div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div><span class="block text-xs text-gray-500">Layout</span>{{ item.layoutName || item.layoutId || "—" }}</div>
              <div><span class="block text-xs text-gray-500">Qualifying start</span>{{ formatDate(item.qualifyingStart) }}</div>
              <div><span class="block text-xs text-gray-500">Qualifying end</span>{{ formatDate(item.qualifyingEnd) }}</div>
              <div><span class="block text-xs text-gray-500">Last race date</span>{{ formatDate(item.lastRaceDate) }}</div>
              <div v-if="item.rolledBackAt"><span class="block text-xs text-gray-500">Rolled back</span>{{ formatDateTime(item.rolledBackAt) }} by {{ item.rolledBackByName }}</div>
            </div>
            <p v-if="item.errorMessage" class="rounded-md bg-red-50 p-3 text-sm text-red-800">{{ item.errorMessage }}</p>
            <div v-if="detail.timeChanges.length" class="max-h-80 overflow-auto rounded-md border border-gray-200 bg-white">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="sticky top-0 bg-gray-100 text-left text-xs uppercase text-gray-600">
                  <tr>
                    <th class="px-3 py-2">Change</th><th class="px-3 py-2">Course</th><th class="px-3 py-2">Gender</th>
                    <th class="px-3 py-2">Event</th><th class="px-3 py-2">Age</th><th class="px-3 py-2">Previous</th><th class="px-3 py-2">Imported</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="change in detail.timeChanges" :key="change.id">
                    <td class="px-3 py-2 capitalize">{{ change.operation }}</td>
                    <td class="px-3 py-2 uppercase">{{ change.course }}</td>
                    <td class="px-3 py-2">{{ change.gender }}</td>
                    <td class="px-3 py-2">{{ change.distance }} {{ change.stroke.replaceAll('_', ' ') }}</td>
                    <td class="px-3 py-2">{{ change.age }}</td>
                    <td class="px-3 py-2">{{ change.previousTimeString || "—" }}</td>
                    <td class="px-3 py-2 font-medium">{{ change.importedTimeString }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </article>
    </div>
  </StandardPage>
</template>
