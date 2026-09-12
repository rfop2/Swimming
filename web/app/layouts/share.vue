<script setup lang="ts">
  const config = useRuntimeConfig()
  const user = useUser()
</script>

<template>
  <div class="min-h-full flex flex-col">
    <header class="border-b border-gray-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-24 items-center justify-between">
          <a
            href="/"
            class="flex items-center gap-x-4"
          >
            <img
              src="/images/SwimRacingLogo.svg"
              :alt="config.public.siteName"
              class="w-28"
            >
            <span class="text-xl font-semibold text-gray-900">{{ config.public.siteName }}</span>
          </a>
          <a
            :href="user ? '/personal-bests' : '/login'"
            class="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            {{ user ? 'Dashboard' : 'Sign in' }}
          </a>
        </div>
      </div>
    </header>
    <main class="flex-1 overflow-auto px-4 py-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <slot />
      </div>
    </main>
  </div>
</template>
