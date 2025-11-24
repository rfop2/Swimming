<script setup lang="ts">
  import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
  import classNames from "classnames"

  const model = defineModel<UISelection["value"] | Array<UISelection["value"]>>()

  const defaultId = useId()

  const props = withDefaults( defineProps<{
    id?: string
    options: Array<UISelection>
    label?: string
    multiple?: boolean
    multipleLabel?: string
    required?: boolean
    placeholder?: string
  }>(), {
    id: undefined,
    label: undefined,
    multiple: false,
    multipleLabel: undefined,
    required: false,
    placeholder: "Select Option",
  } )

  const empty = computed( () => Array.isArray( model.value ) ? model.value.length === 0 : ( model.value === null || model.value === undefined ) )
  const prompt = computed( () => empty.value ? props.placeholder : ( props.multiple ? ( props.multipleLabel ?? ( ( model.value ?? [] ) as Array<UISelection["value"]> ).map( v => props.options.find( o => o.value === v )?.label ?? v ).join( ", " ) ) : ( props.options.find( o => o.value === model.value )?.label ?? model.value ) ) )
</script>

<template>
  <Listbox
    :id="props.id ?? defaultId"
    v-model="model"
    as="div"
    :multiple="props.multiple"
    :required="props.required"
  >
    <ListboxLabel
      v-if="props.label"
      class="block text-sm font-medium leading-6 text-gray-900"
    >
      {{ props.label }}
    </ListboxLabel>
    <div :class="classNames( 'relative', { 'mt-2': props.label } )">
      <ListboxButton
        class="form-disabled relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
      >
        <span class="block truncate">{{ prompt }}</span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon
            class="form-disabled h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </span>
      </ListboxButton>
      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          <ListboxOption
            v-for="option in props.options"
            :key="option.value"
            v-slot="{ active, selected }"
            as="template"
            :value="option.value"
          >
            <li :class="[active ? 'bg-indigo-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.label ?? option.value }}</span>

              <span
                v-if="selected"
                :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"
              >
                <CheckIcon
                  class="h-5 w-5"
                  aria-hidden="true"
                />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>
