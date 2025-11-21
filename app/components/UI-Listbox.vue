<script setup lang="ts">
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions
} from "@headlessui/vue"
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
import classNames from "classnames"

const model = defineModel<
  UISelection["value"] |
  UISelection |
  Array<UISelection["value"] | UISelection>
>()

const defaultId = useId()

const props = withDefaults(defineProps<{
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
})

const normalizeItem = (item: unknown) => {
  if (item && typeof item === "object" && "value" in (item as any)) {
    return (item as any).value
  }
  return item
}

const internalValue = computed(() => {
  if (props.multiple) {
    const current = Array.isArray(model.value) ? model.value : []
    return current.map(normalizeItem)
  }

  return normalizeItem(model.value) as UISelection["value"] | null
})

const empty = computed(() => {
  if (props.multiple) {
    const arr = internalValue.value as Array<unknown>
    return !Array.isArray(arr) || arr.length === 0
  }
  const v = internalValue.value as unknown
  return v === null || v === undefined || v === ""
})

const prompt = computed(() => {
  if (empty.value) return props.placeholder

  if (props.multiple) {
    const values = (internalValue.value as Array<unknown>) || []
    const labels = values.map((v) => {
      const opt = props.options.find(o => o.value === v)
      return opt?.label ?? String(v ?? "")
    })

    if (props.multipleLabel) return props.multipleLabel
    return labels.join(", ")
  }

  const v = internalValue.value
  const opt = props.options.find(o => o.value === v)
  return opt?.label ?? String(v ?? "")
})

const onUpdateInternal = (newVal: any) => {

  if (props.multiple) {
    const values = Array.isArray(newVal) ? newVal : []

    const current = model.value
    const parentUsesObjects =
      Array.isArray(current) && current.some(i => i && typeof i === "object")

    if (parentUsesObjects) {
      model.value = values.map(v =>
        props.options.find(o => o.value === v) ?? { value: v, label: String(v) }
      ) as any
    } else {
      model.value = values as any
    }
  } else {
    const current = model.value
    const parentUsesObject = current && typeof current === "object"

    if (parentUsesObject) {
      model.value = (props.options.find(o => o.value === newVal) ??
        { value: newVal, label: String(newVal) }) as any
    } else {
      model.value = newVal as any
    }
  }
}
</script>

<template>
  <Listbox
    :id="props.id ?? defaultId"
    v-model="internalValue"
    as="div"
    :multiple="props.multiple"
    :required="props.required"
    @update:model-value="onUpdateInternal"
  >
    <ListboxLabel
      v-if="props.label"
      class="block text-sm font-medium leading-6 text-gray-900"
    >
      {{ props.label }}
    </ListboxLabel>

    <div :class="classNames('relative', { 'mt-2': props.label })">
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
        <ListboxOptions
          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
        >
          <ListboxOption
            v-for="option in props.options"
            :key="option.value"
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
              <span
                :class="[
                  selected ? 'font-semibold' : 'font-normal',
                  'block truncate'
                ]"
              >
                {{ option.label ?? option.value }}
              </span>

              <span
                v-if="selected"
                :class="[
                  active ? 'text-white' : 'text-indigo-600',
                  'absolute inset-y-0 right-0 flex items-center pr-4'
                ]"
              >
                <CheckIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>
