<script setup lang="ts">
  useTasksCheck()
</script>

<template>
  <div class="min-h-full">
    <NavBar />
    <div class="py-4">
      <main>
        <div class="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
