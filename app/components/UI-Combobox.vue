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

  const model = defineModel<UISelection | Array<UISelection>>()

  const defaultId = useId()

  const props = withDefaults( defineProps<{
    id?: string
    options: UISelection[]
    label?: string
    multiple?: boolean
    required?: boolean
    placeholder?: string
  }>(), {
    id: undefined,
    label: undefined,
    multiple: false,
    required: false,
    placeholder: "Select Option or Add New",
  } )

  // const empty = computed( () => Array.isArray( model.value ) ? model.value.length === 0 : !model.value )
  // const prompt = computed( () => empty.value ? props.placeholder : ( props.multiple ? ( ( model.value ?? [] ) as Array<UISelection> ).map( item => item.label ?? item.value ).join( ", " ) : ( model.value as UISelection ).label ?? ( model.value as UISelection ).value ) )

  const query = ref( "" )

  const queryValue = computed( () => {
    return query.value === "" ? null : { label: query.value, value: query.value }
  } )
</script>

<template>
  <Combobox
    :id="props.id ?? defaultId"
    v-model="model"
    as="div"
    @update:model-value="query = ''"
  >
    <ComboboxLabel
      v-if="props.label"
      class="block text-sm/6 font-medium text-gray-900"
    >
      {{ props.label }}
    </ComboboxLabel>
    <div :class="classNames( 'relative', { 'mt-2': props.label } )">
      <ComboboxInput
        class="block w-full rounded-md bg-white py-1.5 pl-3 pr-12 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
        :display-value="(option) => (option as UISelection).label ?? ''"
        @change="query = $event.target.value"
        @blur="query = ''"
      />
      <ComboboxButton class="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
        <ChevronDownIcon
          class="size-5 text-gray-400"
          aria-hidden="true"
        />
      </ComboboxButton>

      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class=""
        leave-to-class="opacity-0"
      >
        <ComboboxOptions
          v-if="options.length > 0 || query.length > 0"
          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline outline-1 outline-black/5 sm:text-sm"
        >
          <ComboboxOption
            v-if="queryValue"
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
            v-for="option in options"
            :key="option.label"
            v-slot="{ active }"
            :value="option"
            as="template"
          >
            <li :class="['relative cursor-default select-none px-3 py-2', active ? 'bg-indigo-600 text-white outline-none' : 'text-gray-900']">
              <div class="flex">
                <span class="truncate">
                  {{ option.label }}
                </span>
              </div>
            </li>
          </ComboboxOption>
        </ComboboxOptions>
      </transition>
    </div>
  </Combobox>
</template>
