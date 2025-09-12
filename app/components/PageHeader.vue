<script setup lang="ts">
  const props = withDefaults( defineProps<{
    title: string
  }>(), {
  } )
</script>

<template>
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1 class="text-base font-semibold leading-6 text-gray-900">
        {{ props.title }}
      </h1>
      <p class="mt-2 text-sm text-gray-700">
        <slot />
      </p>
    </div>
  </div>
</template>
