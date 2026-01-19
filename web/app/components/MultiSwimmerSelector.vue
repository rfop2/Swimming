<script setup lang="ts">
  import type { ExtSwimmer } from "lib"

  const model = defineModel<string[]>( { required: true } )

  const props = withDefaults(
    defineProps<{
      max?: number
      label?: string
      placeholder?: string
    }>(),
    {
      max: 5,
      label: "Swimmers",
      placeholder: "Type a name to add…",
    }
  )

  const { swimmers } = useSwimmers()

  const query = ref( "" )
  const open = ref( false )
  const inputRef = ref<HTMLInputElement | null>( null )

  const selectedSafe = computed<string[]>( () => ( Array.isArray( model.value ) ? model.value.map( ( v ) => String( v ) ) : [] ) )
  const selectedIds = computed( () => new Set( selectedSafe.value ) )

  const swimmerMap = computed( () => new Map<string, ExtSwimmer>( ( swimmers.value ?? [] ).map( ( s ) => [ String( s.id ), s ] ) ) )

  const remaining = computed( () => Math.max( 0, props.max - selectedSafe.value.length ) )
  const isFull = computed( () => selectedSafe.value.length >= props.max )

  const filtered = computed( () => {
    const q = query.value.trim().toLowerCase()
    const list = swimmers.value ?? []

    const base = list.filter( ( s ) => !selectedIds.value.has( String( s.id ) ) )
    if ( !q ) return base.slice( 0, 20 )

    return base
      .filter( ( s ) => {
        const name = ( s.fullName ?? "" ).toLowerCase()
        const first = ( s.firstName ?? "" ).toLowerCase()
        const last = ( s.lastName ?? "" ).toLowerCase()
        return name.includes( q ) || first.includes( q ) || last.includes( q )
      } )
      .slice( 0, 20 )
  } )

  const add = ( s: ExtSwimmer ) => {
    if ( isFull.value ) return
    const id = String( s.id )
    if ( selectedIds.value.has( id ) ) return

    model.value = [ ...selectedSafe.value, id ].slice( 0, props.max )
    query.value = ""
    open.value = true
    nextTick( () => inputRef.value?.focus() )
  }

  const remove = ( id: string ) => {
    const sid = String( id )
    model.value = selectedSafe.value.filter( ( v ) => v !== sid )
    nextTick( () => inputRef.value?.focus() )
  }

  const clearAll = () => {
    model.value = []
    nextTick( () => inputRef.value?.focus() )
  }

  const onKeydown = ( e: KeyboardEvent ) => {
    if ( e.key === "Escape" ) {
      open.value = false
      return
    }
    if ( e.key === "Backspace" && !query.value && selectedSafe.value.length ) {
      remove( selectedSafe.value[selectedSafe.value.length - 1] )
    }
  }

  const closeWithDelay = () => {
    window.setTimeout( () => {
      open.value = false
    }, 120 )
  }
</script>

<template>
  <div class="w-full">
    <div class="flex items-end justify-between gap-3">
      <div class="flex flex-col">
        <label class="text-sm font-medium text-gray-900">
          {{ props.label }}
        </label>
        <p class="text-xs text-gray-500">
          {{ selectedSafe.length }} / {{ props.max }} selected
          <span v-if="remaining">· {{ remaining }} remaining</span>
        </p>
      </div>

      <button
        v-if="selectedSafe.length"
        type="button"
        class="text-xs font-medium text-gray-600 hover:text-gray-900"
        @click="clearAll"
      >
        Clear
      </button>
    </div>

    <div class="mt-2 rounded-md border border-gray-300 bg-white p-2">
      <div class="flex flex-wrap gap-2">
        <span
          v-for="id in selectedSafe"
          :key="id"
          class="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800"
        >
          <span class="truncate max-w-[220px]">
            {{ swimmerMap.get(id)?.fullName ?? id }}
          </span>
          <button
            type="button"
            class="rounded-full px-1 text-gray-500 hover:text-gray-900"
            aria-label="Remove swimmer"
            @click="remove(id)"
          >
            ×
          </button>
        </span>

        <div class="relative flex-1 min-w-[220px]">
          <input
            ref="inputRef"
            v-model="query"
            :placeholder="isFull ? `Limit reached (${props.max})` : props.placeholder"
            class="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
            :disabled="isFull"
            @focus="open = true"
            @blur="closeWithDelay"
            @keydown="onKeydown"
          >

          <div
            v-if="open && !isFull"
            class="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg"
          >
            <button
              v-for="s in filtered"
              :key="String(s.id)"
              type="button"
              class="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              @mousedown.prevent="add(s)"
            >
              <div class="font-medium">{{ s.fullName }}</div>
              <div class="text-xs text-gray-500">
                {{ s.gender }}<span v-if="s.birthday"> · {{ s.birthday }}</span>
              </div>
            </button>

            <div
              v-if="!filtered.length && query.trim().length"
              class="px-3 py-3 text-sm text-gray-500"
            >
              No swimmers found.
            </div>

            <div
              v-else-if="!filtered.length && !query.trim().length"
              class="px-3 py-3 text-sm text-gray-500"
            >
              Start typing to search swimmers.
            </div>
          </div>
        </div>
      </div>

      <p v-if="isFull" class="mt-2 text-xs text-gray-500">
        You can select up to {{ props.max }} swimmers.
      </p>
    </div>
  </div>
</template>
