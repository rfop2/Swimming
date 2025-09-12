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
    class="pb-3 sm:flex sm:items-center sm:justify-between"
    :class="classNames({ 'border-b border-gray-200': props.border })"
  >
    <div class="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 mt-3">
      <slot />
    </div>
  </div>
</template>
