<script lang="ts" setup>
  const config = useRuntimeConfig()
</script>

<template>
  <div>
    <div class="flex flex-shrink-0 justify-center">
      <nuxt-link to="/">
        <img
          src="/images/SwimRacing.svg"
          :title="config.public.siteName"
          class="w-48"
        >
      </nuxt-link>
    </div>
    <h2 v-if="$slots.default" class="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
      <slot />
    </h2>
  </div>
</template>
