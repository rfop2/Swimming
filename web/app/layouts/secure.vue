<script setup lang="ts">
  const { navVisible } = useLayoutUi()

  useTasksCheck()
</script>

<template>
  <div class="h-full flex flex-col">
    <NavBar v-if="navVisible" />
    <main class="flex-1 min-h-0">
      <!-- Normal pages -->
      <div
        v-if="!$route.meta.fullBleed"
        class="h-full overflow-auto px-4 py-4 sm:px-6 lg:px-8"
      >
        <div class="mx-auto" :class="($route.meta.maxWidth as string) ?? 'max-w-7xl'">
          <slot />
        </div>
      </div>
      <!-- Full-bleed pages -->
      <div
        v-else
        class="h-full"
      >
        <slot />
      </div>
    </main>
  </div>
</template>
