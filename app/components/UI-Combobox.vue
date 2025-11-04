<script setup lang="ts">
  import { ChevronDownIcon } from "@heroicons/vue/20/solid"
  import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxLabel,
    ComboboxOption,
    ComboboxOptions,
  } from "@headlessui/vue"
  import classNames from "classnames"
  import { XMarkIcon } from "@heroicons/vue/24/outline"

  const model = defineModel<UISelection["value"] | Array<UISelection["value"]>>()

  const defaultId = useId()

  const props = withDefaults( defineProps<{
    id?: string
    options?: UISelection[]
    fetchOptions?: ( query: string ) => Promise<UISelection[]>
    label?: string
    multiple?: boolean
    required?: boolean
    strict?: boolean
    clearable?: boolean
    placeholder?: string
    debounceMs?: number
  }>(), {
    id: undefined,
    options: () => [],
    fetchOptions: undefined,
    label: undefined,
    multiple: false,
    required: false,
    strict: true,
    clearable: true,
    placeholder: "Select Option or Add New",
    debounceMs: 300,
  } )

  // const empty = computed( () => Array.isArray( model.value ) ? model.value.length === 0 : !model.value )
  // const prompt = computed( () => empty.value ? props.placeholder : ( props.multiple ? ( ( model.value ?? [] ) as Array<UISelection> ).map( item => item.label ?? item.value ).join( ", " ) : ( model.value as UISelection ).label ?? ( model.value as UISelection ).value ) )

  const query = ref( "" )
  const loading = ref( false )
  const internalOptions = ref<UISelection[]>( props.options )

  // Debounced search
  const runSearch = useDebounceAsync( async ( q: string ) => {
    if ( !props.fetchOptions ) return
    loading.value = true
    try {
      internalOptions.value = await props.fetchOptions( q )
    } finally {
      loading.value = false
    }
  }, props.debounceMs )

  // Watch query updates
  watch( query, ( val ) => {
    if ( props.fetchOptions ) {
      runSearch( val )
    } else {
      internalOptions.value = props.options.filter( ( opt ) => ( opt.label ?? String( opt.value ) ).toLowerCase().includes( val.toLowerCase() ) )
    }
  } )

  const queryValue = computed( () => {
    return query.value === "" ? null : query.value
  } )

  const clearSelection = () => {
    model.value = undefined
    query.value = ""
  }

  watch( model, ( val ) => {
    if ( val === undefined ) query.value = ""
  } )

</script>

<template>
  <Combobox
    :id="props.id ?? defaultId"
    :key="Array.isArray(model) ? model.join('|') || 'empty' : model ?? 'empty'"
    v-model="model"
    v-bind="$attrs"
    as="div"
  >
    <ComboboxLabel
      v-if="props.label"
      class="block text-sm/6 font-medium text-gray-900"
    >
      {{ props.label }}{{ !!required ? "*" : "" }}
    </ComboboxLabel>
    <div :class="classNames( 'relative', { 'mt-2': props.label } )">
      <ComboboxInput
        class="block w-full rounded-md bg-white py-1.5 pl-3 pr-12 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
        :display-value="(value) => {
          if (value === undefined) return '' // explicitly clear when undefined
          const found = internalOptions.find(opt => opt.value === value)
          // if the value is not in the options, treat as cleared
          return found ? found.label ?? String(found.value) : ''
        }"
        :placeholder="placeholder"
        @change="query = $event.target.value"
      />
      <div class="absolute inset-y-0 right-2 flex">
        <!-- Dropdown button -->
        <ComboboxButton
          v-if="internalOptions.length"
          class="relative items-center rounded-r-md focus:outline-none"
        >
          <ChevronDownIcon
            class="size-5 text-gray-400"
            aria-hidden="true"
          />
        </ComboboxButton>
        <!-- Clear button -->
        <ComboboxButton
          v-if="clearable && model"
          type="button"
          class="relative items-center rounded-r-md focus:outline-none"
          @click="clearSelection"
        >
          <XMarkIcon
            class="size-5 text-gray-400"
            aria-hidden="true"
          />
        </ComboboxButton>
      </div>

      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class=""
        leave-to-class="opacity-0"
      >
        <ComboboxOptions
          v-if="options.length > 0 || query.length > 0"
          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline outline-1 outline-black/5 sm:text-sm"
        >
          <div
            v-if="loading"
            class="p-2 text-gray-500 text-sm"
          >
            Loading...
          </div>
          <div
            v-else-if="internalOptions.length === 0"
            class="p-2 text-gray-500 text-sm"
          >
            No results found
          </div>
          <ComboboxOption
            v-if="!strict && queryValue"
            v-slot="{ active }"
            :value="queryValue"
            as="template"
          >
            <li :class="['relative cursor-default select-none px-3 py-2', active ? 'bg-indigo-600 text-white outline-none' : 'text-gray-900']">
              <span class="block truncate">
                Create {{ query }}
              </span>
            </li>
          </ComboboxOption>
          <ComboboxOption
            v-for="option in internalOptions"
            :key="option.value"
            v-slot="{ active }"
            :value="option.value"
            as="template"
          >
            <li :class="['relative cursor-default select-none px-3 py-2', active ? 'bg-indigo-600 text-white outline-none' : 'text-gray-900']">
              <div class="flex">
                <span class="truncate">
                  {{ option.label ?? option.value }}
                </span>
              </div>
            </li>
          </ComboboxOption>
        </ComboboxOptions>
      </transition>
    </div>
  </Combobox>
</template>
