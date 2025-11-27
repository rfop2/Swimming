<script setup lang="ts">
  import classNames from "classnames"

  const props = withDefaults( defineProps<{
    title: string
  }>(), {
  } )

</script>

<template>
  <!-- Page Header -->
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1 class="text-base font-semibold leading-6 text-gray-900">
        {{ props.title }}
      </h1>
      <p class="mt-2 text-sm text-gray-700">
        <slot name="description" />
      </p>
    </div>
  </div>

  <!-- Page Controls -->
  <div
    v-if="$slots.controls"
    class="pb-3 sm:flex sm:items-center sm:justify-between"
    :class="classNames({ 'border-b border-gray-200': !$slots.key })"
  >
    <div class="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 mt-3">
      <slot name="controls" />
    </div>
  </div>

  <!-- Page Key -->
  <div
    v-if="$slots.key"
    class="pb-4 border-b border-gray-200"
  >
    <div
      class="mt-2 bg-white shadow sm:rounded-lg"
    >
      <p class="p-4 text-sm text-gray-700">
        <slot name="key" />
      </p>
    </div>
  </div>

  <!-- Page Content -->
  <div class="mt-4 flow-root">
    <slot />
  </div>
</template>
