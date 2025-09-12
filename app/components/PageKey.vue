<script setup lang="ts">
  import classNames from "classnames"

  const props = withDefaults( defineProps<{
    border?: boolean
  }>(), {
    border: true,
  } )
</script>

<template>
  <div
    class="pb-4"
    :class="classNames({ 'border-b border-gray-200': props.border })"
  >
    <div
      class="mt-2 bg-white shadow sm:rounded-lg"
    >
      <p class="p-4 text-sm text-gray-700">
        <slot />
      </p>
    </div>
  </div>
</template>
