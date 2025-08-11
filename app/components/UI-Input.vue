<script setup lang="ts">
  import { XMarkIcon } from "@heroicons/vue/24/outline"
  import classNames from "classnames"

  const model = defineModel<string | number>()

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
  >{{ props.label }}</label>
  <div :class="classNames({ 'mt-2': props.label })">
    <input
      :id="props.id ?? defaultId"
      v-model="model"
      :type="props.type"
      class="block w-full rounded-md text-gray-900 py-1.5 sm:text-sm sm:leading-6"
      :placeholder="props.placeholder"
      :required="props.required"
    >
    <button
      v-if="props.clearable"
      type="button"
      class="absolute top-1/2 right-2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
      onclick="this.previousElementSibling.value = ''"
    >
      <XMarkIcon
        class="block h-6 w-6"
      />
    </button>
  </div>
</template>
