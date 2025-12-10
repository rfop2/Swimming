<script lang="ts" setup>
  import { CheckCircleIcon, XCircleIcon } from "@heroicons/vue/24/outline"
  import type { FetchError } from "ofetch"

  useHead( {
    title: "Forgot Password",
    meta: [
      { name: "description", content: "Initiate password reset" }
    ]
  } )

  const user = useUser()
  if ( user.value ) {
    await navigateTo( "/account" )
  }

  const email = ref( "" )
  const sent = ref( false )
  const errString = ref<string | null>( null )

  async function forgotPassword( _e: Event ) {
    try {
      await $fetch( "/api/auth/request-reset", {
        method: "POST",
        // body: new FormData( e.target as HTMLFormElement )
        body: { email: email.value },
      } )
      sent.value = true
      errString.value = null
    } catch ( error ) {
      errString.value = ( error as FetchError ).message ?? null
    }
  }
</script>

<template>
  <div class="sm:mx-auto sm:w-full sm:max-w-sm">
    <div>
      <div class="flex flex-shrink-0 justify-center">
        <img
          src="/images/SwimRacing.svg"
          title="Swim.Racing"
          class="w-48"
        >
      </div>
      <h2 class="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
        Forgot your password?
      </h2>
    </div>

    <div class="mt-6">
      <form
        v-if="!sent"
        class="space-y-6"
        action="#"
        method="POST"
        @submit.prevent="forgotPassword"
      >
        <div>
          <UI-Input
            v-model="email"
            label="Email address"
            type="email"
            autocomplete="email"
            required
          />
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
                Password reset failed
              </h3>
              <div class="mt-2 text-sm text-red-700">
                <p>Please check your email address and try again.</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Reset password
          </button>
        </div>
      </form>

      <div
        v-if="sent"
        class="rounded-md bg-green-50 p-4"
      >
        <div class="flex">
          <div class="shrink-0">
            <CheckCircleIcon
              class="size-5 text-red-400"
              aria-hidden="true"
            />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-700">
              Password reset requested
            </h3>
            <div class="mt-2 text-sm text-red-700">
              <p>Please check your email and follow the instructions.</p>
            </div>
          </div>
        </div>
      </div>

      <p class="mt-10 text-center text-sm text-gray-500">
        Not a member?
        {{ ' ' }}
        <nuxt-link
          href="/register"
          class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
        >
          Register
        </nuxt-link> to apply for an account.
        <br>
        Or <nuxt-link
          href="/login"
          class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
        >login</nuxt-link> to your account.
      </p>
    </div>
  </div>
</template>
