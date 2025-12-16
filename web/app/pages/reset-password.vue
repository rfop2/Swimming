<script lang="ts" setup>
  import { CheckCircleIcon, XCircleIcon } from "@heroicons/vue/24/outline"
  import { useForm } from "vee-validate"
  import * as yup from "yup"
  import { toTypedSchema } from "@vee-validate/yup"
  import type { FetchError } from "ofetch"

  useHead( {
    title: "Reset Password",
    meta: [
      { name: "description", content: "Reset your password" }
    ]
  } )

  const user = useUser()
  if ( user.value ) {
    await navigateTo( "/account" )
  }

  const route = useRoute()
  const token = computed( () => route.query.token as string )

  if ( !token.value ) {
    await navigateTo( "/login" )
  }

  const { values, errors, meta, defineField, resetForm, handleSubmit } = useForm( {
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema: toTypedSchema(
      yup.object( {
        password: yup.string()
          .test(
            "skip-placeholder-validation",
            "Password must be 8-32 chars, include upper/lowercase, digit & symbol",
            value => {
              // Your strict password validation
              if ( !value ) return false
              const length = value.length >= 8 && value.length <= 32
              const lower = /[a-z]/.test( value )
              const upper = /[A-Z]/.test( value )
              const digit = /[0-9]/.test( value )
              const symbol = /[^\w\s]/.test( value )
              return length && lower && upper && digit && symbol
            }
          ),
        confirmPassword: yup.string()
          .test(
            "skip-placeholder-validation",
            "Passwords must match",
            function( value ) {
              const { password } = this.parent
              // Confirm password only if password field is not the placeholder
              return value === password
            }
          ),
      } ),
    ),
  } )

  const [ password, passwordAttrs ] = defineField( "password" )
  const [ confirmPassword, confirmPasswordAttrs ] = defineField( "confirmPassword" )

  const errString = ref<string | null>( null )

  const submitErrors = reactive<Array<string>>( [] )

  const saveSuccess = ref( false )
  const resetPassword = handleSubmit( async () => {
    try {
      submitErrors.length = 0
      await $fetch( "/api/auth/reset-password", {
        method: "POST",
        body: { token: token.value, newPassword: password.value },
      } )
      resetForm( { values } )
      saveSuccess.value = true
    } catch ( error ) {
      console.error( "Error", error )
      submitErrors[0] = ( error as FetchError ).message ?? null
    }
  } )
</script>

<template>
  <div class="sm:mx-auto sm:w-full sm:max-w-sm">
    <SiteBanner>
      Reset your password
    </SiteBanner>

    <div v-if="!saveSuccess" class="mt-6">
      <form
        class="space-y-6"
        action="#"
        method="POST"
        @submit.prevent="resetPassword"
      >
        <div>
          <div class="sm:col-span-2">
            <UI-Input
              id="password"
              v-model="password"
              label="Password"
              v-bind="passwordAttrs"
              type="password"
              autocomplete="off"
            />
            <span class="text-sm text-red-500">{{ errors.password }}</span>
          </div>
        </div>

        <div class="sm:col-span-2">
          <UI-Input
            id="confirmPassword"
            v-model="confirmPassword"
            label="Confirm Password"
            v-bind="confirmPasswordAttrs"
            type="password"
            autocomplete="off"
          />
          <span class="text-sm text-red-500">{{ errors.confirmPassword }}</span>
        </div>

        <div
          v-if="submitErrors.length"
          class="rounded-md bg-red-50 p-4"
        >
          <div class="flex">
            <div class="shrink-0">
              <XCircleIcon
                class="size-5 text-red-400"
                aria-hidden="true"
              />
            </div>
            <div
              v-if="submitErrors.length===1"
              class="ml-3"
            >
              <h3 class="text-sm font-medium text-red-800">
                There were errors with your submission
              </h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{{ submitErrors[0] }}</p>
              </div>
            </div>
            <div
              v-else
              class="ml-3"
            >
              <h3 class="text-sm font-medium text-red-800">
                There were {{ submitErrors.length }} errors with your submission
              </h3>
              <div class="mt-2 text-sm text-red-700">
                <ul
                  role="list"
                  class="list-disc space-y-1 pl-5"
                >
                  <li
                    v-for="error in submitErrors"
                    :key="error"
                  >
                    {{ error }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="fixed bottom-6 right-6 flex gap-x-4 sm:hidden z-50 pl-6 bg-white">
          <button
            type="submit"
            :disabled="!meta.dirty || !!Object.entries(errors).length"
            class="rounded-md bg-indigo-600 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Reset Password
          </button>
        </div>

        <div class="hidden sm:flex sticky bottom-0 bg-white border-t py-4 justify-end gap-x-6">
          <button
            type="submit"
            :disabled="!meta.dirty || !!Object.entries(errors).length"
            class="flex w-full justify-center rounded-md bg-indigo-600 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Reset Password
          </button>
        </div>
      </form>

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
              Reset failed
            </h3>
            <div class="mt-2 text-sm text-red-700">
              <p>Please check your password and try again.</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <div
      v-if="saveSuccess"
      class="rounded-md bg-green-50 p-4 mt-4"
    >
      <div class="flex">
        <div class="shrink-0">
          <CheckCircleIcon
            class="size-5 text-red-400"
            aria-hidden="true"
          />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            Password reset success
          </h3>
          <div class="mt-2 text-sm text-red-700">
            <p>You can now <nuxt-link
              href="/login"
              class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
            >login</nuxt-link> to your account.
            </p>
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
      Remembered your password? <nuxt-link
        href="/login"
        class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
      >Login</nuxt-link> to your account.
    </p>

  </div>
</template>
