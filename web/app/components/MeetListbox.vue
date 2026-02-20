<script setup lang="ts">
  import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
  import classNames from "classnames"

  type MeetRow = {
    id: string
    name: string
    date: string
    course: string
    location: string | null
    code: string
  }

  type Option = { value: string | null; label: string }

  const model = defineModel<string | null>()

  const defaultId = useId()

  const props = withDefaults(
    defineProps<{
      id?: string
      course: string
      label?: string
      required?: boolean
      placeholder?: string
      error?: string
      searchPlaceholder?: string
      panelClass?: string
      debounceMs?: number
    }>(),
    {
      id: undefined,
      label: undefined,
      required: false,
      placeholder: "Choose Meet (optional)",
      error: "",
      searchPlaceholder: "Search meet…",
      panelClass: "max-h-[60vh]",
      debounceMs: 250,
    }
  )

  const query = ref( "" )
  const debounced = ref( "" )
  let t: ReturnType<typeof setTimeout> | null = null

  watch( query, ( v ) => {
    if ( t ) clearTimeout( t )
    t = setTimeout( () => {
      debounced.value = v
    }, props.debounceMs )
  } )

  onBeforeUnmount( () => {
    if ( t ) clearTimeout( t )
  } )

  watch(
    () => props.course,
    () => {
      model.value = null
      query.value = ""
      debounced.value = ""
    }
  )

  const { data: meets, pending } = useAsyncData(
    () => `meet-listbox-${props.course}-${debounced.value}`,
    () =>
      $fetch<MeetRow[]>( "/api/competition/meets-video-timer-sessions", {
        query: {
          course: props.course,
          q: debounced.value.trim() ? debounced.value.trim() : undefined,
        },
      } ),
    { default: () => [] }
  )

  const sorted = computed( () => {
    const list = ( meets.value ?? [] ).slice()
    list.sort( ( a, b ) => {
      const da = String( a.date ?? "" )
      const db = String( b.date ?? "" )
      if ( da !== db ) return db.localeCompare( da )
      return String( a.name ?? "" ).localeCompare( String( b.name ?? "" ) )
    } )
    return list
  } )

  const options = computed<Option[]>( () => {
    return [
      { value: null, label: "No meet (optional)" },
      ...sorted.value.map( ( m ) => ( {
        value: String( m.id ),
        label: `${m.date} • ${m.name}`,
      } ) ),
    ]
  } )

  const empty = computed( () => model.value === null || model.value === undefined )

  const prompt = computed( () => {
    if ( empty.value ) return props.placeholder
    return options.value.find( ( o ) => o.value === model.value )?.label ?? String( model.value )
  } )
</script>

<template>
  <Listbox :id="props.id ?? defaultId" v-model="model" as="div" :required="props.required">
    <ListboxLabel v-if="props.label" class="block text-sm font-medium leading-6 text-gray-900">
      {{ props.label }}
    </ListboxLabel>

    <div :class="classNames('relative', { 'mt-1 sm:mt-2': props.label })">
      <ListboxButton
        class="form-disabled relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
      >
        <span class="block truncate">{{ prompt }}</span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon class="form-disabled h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </ListboxButton>

      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <ListboxOptions
          class="absolute z-10 mt-1 w-full overflow-hidden rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
        >
          <div class="p-2 border-b border-gray-200">
            <input
              v-model="query"
              class="w-full h-9 px-3 rounded-md border border-gray-300 text-sm"
              :placeholder="props.searchPlaceholder"
              @keydown.space.stop
              @keydown.enter.stop
            >
          </div>

          <div class="overflow-auto" :class="props.panelClass">
            <div v-if="pending" class="px-3 py-2 text-xs text-gray-500">Loading…</div>

            <div v-else-if="options.length === 1" class="px-3 py-2 text-xs text-gray-500">
              No matches.
            </div>

            <ListboxOption
              v-for="option in options"
              :key="option.value ?? '__none__'"
              v-slot="{ active, selected }"
              as="template"
              :value="option.value"
            >
              <li
                :class="[
                  active ? 'bg-indigo-600 text-white' : 'text-gray-900',
                  'relative cursor-default select-none py-2 pl-3 pr-9'
                ]"
              >
                <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                  {{ option.label }}
                </span>

                <span
                  v-if="selected"
                  :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </div>
        </ListboxOptions>
      </transition>
    </div>

    <span v-if="props.error" class="text-sm text-red-600">{{ props.error }}</span>
  </Listbox>
</template>
