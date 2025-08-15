<script lang="ts" setup>
  import type { Swimmer } from "lib"
  import type { FetchError } from "ofetch"

  const swimmer = useState<Swimmer>( "swimmer" )

  const errString = ref<string | null>( null )

  async function login( e: Event ) {
    try {
      await $fetch( "/api/user/login", {
        method: "POST",
        body: new FormData( e.target as HTMLFormElement )
      } )
      await navigateTo( swimmer.value ? "/performance" : "/account" )
    } catch ( error ) {
      errString.value = ( error as FetchError ).message ?? null
    }
  }
</script>

<template>
  <div class="sm:mx-auto sm:w-full sm:max-w-sm">
    <div>
      <svg
        class="h-6 w-auto"
        aria-hidden="true"
        viewBox="0 0 36 24"
        fill="none"
      >
        <title>Swim.Racing</title>
        <path
          d="M18.724 1.714c-4.538 0-7.376 2.286-8.51 6.857 1.702-2.285 3.687-3.143 5.957-2.57 1.296.325 2.22 1.271 3.245 2.318 1.668 1.706 3.6 3.681 7.819 3.681 4.539 0 7.376-2.286 8.51-6.857-1.701 2.286-3.687 3.143-5.957 2.571-1.294-.325-2.22-1.272-3.245-2.32-1.668-1.705-3.6-3.68-7.819-3.68zM10.214 12c-4.539 0-7.376 2.286-8.51 6.857 1.701-2.286 3.687-3.143 5.957-2.571 1.294.325 2.22 1.272 3.245 2.32 1.668 1.705 3.6 3.68 7.818 3.68 4.54 0 7.377-2.286 8.511-6.857-1.702 2.286-3.688 3.143-5.957 2.571-1.295-.326-2.22-1.272-3.245-2.32-1.669-1.705-3.6-3.68-7.82-3.68z"
          class="fill-sky-400"
        />
      </svg>
      <h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
        Sign in to your account
      </h2>
    </div>

    <div class="mt-10">
      <form
        class="space-y-6"
        action="#"
        method="POST"
        @submit.prevent="login"
      >
        <div>
          <label
            for="email"
            class="block text-sm font-medium leading-6 text-gray-900"
          >Email address</label>
          <div class="mt-2">
            <input
              id="email"
              name="username"
              type="email"
              autocomplete="email"
              required
              class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label
              for="password"
              class="block text-sm font-medium leading-6 text-gray-900"
            >Password</label>
            <div class="text-sm">
              <nuxt-link
                href="/forgot-password"
                class="font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Forgot password?
              </nuxt-link>
            </div>
          </div>
          <div class="mt-2">
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Sign in
          </button>
        </div>
      </form>

      <p class="mt-10 text-center text-sm text-gray-500">
        Not a member?
        {{ ' ' }}
        <nuxt-link
          href="/contact"
          class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
        >
          Contact us for details on how to join
        </nuxt-link>
      </p>
      {{ errString }}
    </div>
  </div>
</template>
