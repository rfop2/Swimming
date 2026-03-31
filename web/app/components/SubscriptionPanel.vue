<script setup lang="ts">
  const { tier, isPaid, refresh } = useSubscription()
  const { getTier, formatPrice } = useTiers()

  const tierInfo = computed( () => getTier( tier.value ) )
  const tierLabel = computed( () => tierInfo.value?.name ?? tier.value )
  const tierPrice = computed( () => {
    if ( !tierInfo.value ) return "—"
    return tierInfo.value.amount === 0
      ? "£0 / month"
      : `${formatPrice( tierInfo.value )} / month`
  } )

  const cancelling = ref( false )
  const cancelError = ref<string | null>( null )
  const showConfirm = ref( false )

  const confirmCancel = async () => {
    cancelling.value = true
    cancelError.value = null
    try {
      await $fetch( "/api/billing/cancel", { method: "POST" } )
      await refresh()
      showConfirm.value = false
    } catch ( err: unknown ) {
      cancelError.value =
        ( err as { data?: { message?: string } } ).data?.message ??
        "Cancellation failed. Please try again."
    } finally {
      cancelling.value = false
    }
  }
</script>

<template>
  <div class="mt-10 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
    <div class="px-6 py-5">
      <h3 class="text-base font-semibold leading-6 text-gray-900">
        Subscription
      </h3>
    </div>

    <div class="px-6 py-5">
      <dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <dt class="text-sm font-medium text-gray-500">
            Current plan
          </dt>
          <dd class="mt-1 flex items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">{{ tierLabel }}</span>
            <span
              v-if="isPaid"
              class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20"
            >Active</span>
            <span
              v-else
              class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
            >Free</span>
          </dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">
            Price
          </dt>
          <dd class="mt-1 text-sm text-gray-900">
            {{ tierPrice }}
          </dd>
        </div>
      </dl>

      <div class="mt-6 flex flex-wrap gap-3">
        <NuxtLink
          to="/pricing"
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {{ isPaid ? 'Change plan' : 'Upgrade' }}
        </NuxtLink>

        <button
          v-if="isPaid && !showConfirm"
          class="rounded-md px-4 py-2 text-sm font-semibold text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50"
          @click="showConfirm = true"
        >
          Cancel subscription
        </button>
      </div>

      <!-- Cancellation confirmation -->
      <div
        v-if="showConfirm"
        class="mt-4 rounded-md bg-red-50 p-4"
      >
        <p class="text-sm text-red-700">
          Are you sure? Your access will revert to the Free tier at the end of the current billing period.
        </p>
        <p
          v-if="cancelError"
          class="mt-2 text-sm font-medium text-red-800"
        >
          {{ cancelError }}
        </p>
        <div class="mt-4 flex gap-3">
          <button
            class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
            :disabled="cancelling"
            @click="confirmCancel"
          >
            {{ cancelling ? 'Cancelling…' : 'Yes, cancel' }}
          </button>
          <button
            class="rounded-md px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
            @click="showConfirm = false"
          >
            Keep my plan
          </button>
        </div>
      </div>

      <p class="mt-4 text-xs text-gray-400">
        Payments are processed via GoCardless Direct Debit. Cancel any time.
      </p>
    </div>
  </div>
</template>
