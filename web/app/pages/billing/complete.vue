<script setup lang="ts">
  definePageMeta( {
    layout:     "secure",
    middleware: [ "protected" ],
  } )

  useHead( { title: "Subscription confirmed" } )

  const route = useRoute()
  const { refresh } = useSubscription()

  type State = "confirming" | "success" | "error"
  const state = ref<State>( "confirming" )
  const errorMessage = ref( "" )

  onMounted( async () => {
    const billingRequestId = route.query.billing_request as string | undefined

    if ( !billingRequestId ) {
      errorMessage.value = "No billing reference found in the return URL."
      state.value = "error"
      return
    }

    try {
      await $fetch( "/api/billing/confirm", {
        method: "POST",
        body:   { billingRequestId },
      } )
      await refresh()
      state.value = "success"
      // Redirect to account after a short pause so the user sees the confirmation
      setTimeout( () => navigateTo( "/account" ), 3000 )
    } catch ( err: unknown ) {
      errorMessage.value =
        ( err as { data?: { message?: string } } ).data?.message ??
        "We could not confirm your subscription. Please contact support."
      state.value = "error"
    }
  } )
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-white px-6">
    <div class="mx-auto max-w-md text-center">
      <!-- Confirming -->
      <template v-if="state === 'confirming'">
        <div class="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <h1 class="text-2xl font-semibold text-gray-900">
          Confirming your subscription…
        </h1>
        <p class="mt-2 text-gray-500">
          Just a moment while we set up your account.
        </p>
      </template>

      <!-- Success -->
      <template v-else-if="state === 'success'">
        <div class="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            class="h-7 w-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-semibold text-gray-900">
          You're all set!
        </h1>
        <p class="mt-2 text-gray-500">
          Your subscription is active. Redirecting you to your account…
        </p>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            class="h-7 w-7 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-semibold text-gray-900">
          Something went wrong
        </h1>
        <p class="mt-2 text-gray-500">
          {{ errorMessage }}
        </p>
        <div class="mt-6 flex justify-center gap-4">
          <NuxtLink
            to="/pricing"
            class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Back to pricing
          </NuxtLink>
          <NuxtLink
            to="/account"
            class="rounded-md px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            Go to account
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>
