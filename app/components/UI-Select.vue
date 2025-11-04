<script setup lang="ts">
  import classNames from "classnames"

  const model = defineModel<string | number>()
  defineOptions( { inheritAttrs: false } )

  const defaultId = useId()

  const props = withDefaults( defineProps<{
    options: Array<UISelection>
    id?: string
    label?: string
    required?: boolean
  }>(), {
    id: undefined,
    label: undefined,
    required: false,
  } )

</script>

<template>
  <label
    v-if="props.label"
    :for="props.id ?? defaultId"
    class="block text-sm/6 font-medium text-gray-900"
  >{{ props.label }}{{ !!required ? "*" : "" }}</label>
  <div :class="classNames( props.label ? 'mt-2' : 'mt-0', 'grid grid-cols-1' )">
    <select
      :id="props.id ?? defaultId"
      v-model="model"
      v-bind="$attrs"
      :required="props.required"
      class="col-start-1 row-start-1 w-full rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6"
    >
      <option
        v-for="option in props.options"
        :key="option.value"
        :selected="option.value === model"
        :value="option.value"
      >
        {{ option.label ?? option.value }}
      </option>
    </select>
  </div>
</template>
