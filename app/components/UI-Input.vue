<script setup lang="ts">
  import { XMarkIcon } from "@heroicons/vue/24/outline"
  import classNames from "classnames"

  const model = defineModel<string | number | boolean>()

  const defaultId = useId()

  const props = withDefaults( defineProps<{
    id?: string
    label?: string
    type?: string
    required?: boolean
    clearable?: boolean
    placeholder?: string
  }>(), {
    id: undefined,
    label: undefined,
    type: "text",
    required: false,
    clearable: false,
    placeholder: "",
  } )

</script>

<template>
  <label
    v-if="props.label"
    :for="props.id ?? defaultId"
    class="block text-sm/6 font-medium text-gray-900"
  >{{ props.label }}{{ !!required ? "*" : "" }}</label>
  <div :class="classNames({ 'mt-2': props.label })">
    <span
      v-if="props.type === 'checkbox' || props.type === 'radio'"
    >
      <div class="group grid size-4 grid-cols-1">
        <input
          :id="props.id ?? defaultId"
          v-model="model"
          :type="props.type"
          class="col-start-1 row-start-1 appearance-none rounded border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
          :required="props.required"
          v-bind="$attrs"
        >
        <svg
          class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-gray-950/25"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            class="opacity-0 group-has-[:checked]:opacity-100"
            d="M3 8L6 11L11 3.5"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            class="opacity-0 group-has-[:indeterminate]:opacity-100"
            d="M3 7H11"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

    </span>
    <span v-else>
      <div class="relative w-full">
        <input
          :id="props.id ?? defaultId"
          v-model="model"
          :type="props.type"
          class="block w-full rounded-md text-gray-900 border-gray-300 py-1.5 sm:text-sm sm:leading-6"
          :placeholder="props.placeholder"
          :required="props.required"
          v-bind="$attrs"
        >
        <button
          v-if="props.clearable"
          :disabled="!model"
          type="button"
          class="absolute top-1/2 right-2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          onclick="this.previousElementSibling.value = ''"
        >
          <XMarkIcon
            class="block h-6 w-6"
          />
        </button>
      </div>
    </span>
  </div>
</template>
