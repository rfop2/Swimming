<script lang="ts" setup>
  import { CheckCircleIcon, XCircleIcon } from "@heroicons/vue/24/outline"
  import type { FetchError } from "ofetch"

  const config = useRuntimeConfig()

  useHead( {
    title: "Login",
    meta: [
      { name: "description", content: "Site login page" }
    ]
  } )

  const user = useUser()
  if ( user.value ) {
    await navigateTo( "/" )
  }

  const errString = ref<string | null>( null )

  async function login( e: Event ) {
    try {
      await $fetch( "/api/user/login", {
        method: "POST",
        body: new FormData( e.target as HTMLFormElement )
      } )
      await navigateTo( "/" )
    } catch ( error ) {
      errString.value = ( error as FetchError ).message ?? null
    }
  }

  const route = useRoute()
  const registered = route.query.registerSuccess !== undefined
</script>

<template>
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <div>
      <SiteBanner/>
      <div
        v-if="registered"
        class="bg-green-50 px-2 py-4 mt-6"
      >
        <div class="flex">
          <div class="shrink-0">
            <CheckCircleIcon
              class="size-6 text-green-400"
              aria-hidden="true"
            />
          </div>
          <div class="ml-3">
            <h2 class="text-lg font-medium">
              Registration success
            </h2>
            <div class="mt-2 text-sm">
              <p>Thank you for registering with {{ config.public.siteName }}. Your account has now been set up and you can sign in below.</p>
            </div>
          </div>
        </div>
      </div>
      <h2 class="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
        Sign in to your account
      </h2>
    </div>

    <div class="mt-6">
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
          >Email address*</label>
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
            >Password*</label>
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

        <div
          v-if="errString"
          class="rounded-md bg-red-50 p-4"
        >
          <div class="flex">
            <div class="shrink-0">
              <XCircleIcon
                class="size-5 text-red-400"
                aria-hidden="true"
              />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">
                Login failed
              </h3>
              <div class="mt-2 text-sm text-red-700">
                <p>Please check your email address and password and try again.</p>
              </div>
            </div>
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
          href="/register"
          class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
        >
          Register to apply for an account.
        </nuxt-link>
      </p>
    </div>
  </div>
</template>
