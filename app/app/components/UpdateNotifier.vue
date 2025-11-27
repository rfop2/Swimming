<script setup lang="ts">
  import { ArrowPathIcon, InformationCircleIcon } from "@heroicons/vue/24/outline"

  const { updateAvailable, newVersion } = useVersionCheck()

  const reload = () => {
    window.location.reload()
  }
</script>

<template>
  <!-- Update Banner -->
  <div
    v-if="updateAvailable"
    class="mx-auto max-w-7xl rounded-md bg-blue-50 p-4"
  >
    <div class="flex">
      <div class="shrink-0">
        <InformationCircleIcon
          class="size-5 text-blue-400"
          aria-hidden="true"
        />
      </div>
      <div class="ml-3 flex-1 md:flex md:justify-between">
        <p class="text-sm text-blue-700">
          A new version is available. Click reload to update to {{ newVersion }}.
        </p>
        <p class="mt-3 text-sm md:ml-6 md:mt-0">
          <button
            type="button"
            class="inline-flex items-center gap-x-1.5 whitespace-nowrap font-medium text-blue-700 hover:text-blue-600"
            @click="reload"
          >
            <span class="whitespace-nowrap">Reload</span>
            <ArrowPathIcon
              class="-mr-0.5 h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </p>
      </div>
    </div>
  </div>
</template>
