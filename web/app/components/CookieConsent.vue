<script setup lang="ts">
  const { enabled, consent, needsDecision, accept, decline } = useAnalyticsConsent()
  const { initialize } = useGtag()

  // Load gtag.js on each visit once the user has previously accepted
  onMounted( () => {
    if ( enabled.value && consent.value === "granted" ) {
      initialize()
    }
  } )
</script>

<template>
  <div
    v-if="needsDecision"
    role="dialog"
    aria-live="polite"
    aria-label="Cookie consent"
    class="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6"
  >
    <div class="mx-auto max-w-3xl rounded-lg bg-white p-4 shadow-lg ring-1 ring-slate-200 sm:flex sm:items-center sm:gap-6">
      <p class="text-sm text-gray-700">
        We use analytics cookies to understand how the site is used so we can improve it.
        These are only set if you accept.
      </p>
      <div class="mt-3 flex shrink-0 gap-2 sm:mt-0">
        <button
          type="button"
          class="rounded-md px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          @click="decline"
        >
          Decline
        </button>
        <button
          type="button"
          class="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
          @click="accept"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
</template>
