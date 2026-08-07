<script setup lang="ts">
  defineProps<{
    current: number
  }>()

  const steps = [ "Select file", "Confirm layout", "Import details", "Review", "Save" ]
</script>

<template>
  <nav
    aria-label="Import progress"
    class="mb-8"
  >
    <ol class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <li
        v-for="( step, index ) in steps"
        :key="step"
        class="flex items-center gap-2"
      >
        <span
          :class="[
            'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
            index + 1 < current ? 'bg-green-600 text-white' :
            index + 1 === current ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
          ]"
        >
          {{ index + 1 < current ? '✓' : index + 1 }}
        </span>
        <span
          :class="index + 1 === current ? 'font-semibold text-gray-900' : 'text-sm text-gray-500'"
        >
          {{ step }}
        </span>
      </li>
    </ol>
  </nav>
</template>
