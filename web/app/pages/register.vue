<script lang="ts" setup>
  import type { User } from "lucia"

  useHead( {
    title: "Register",
    meta: [
      { name: "description", content: "Register for an account" }
    ]
  } )

  const user = useUser()
  if ( user.value ) {
    await navigateTo( "/account" )
  }

  const newUser = ref( {
    id: "0",
    username: "",
    firstName: "",
    lastName: "",
    phone: "",
    location: "",
    type: "parent",
    admin: false
  } as User )

  const saveUser = async ( values: User ) => {
    await $fetch( "/api/user/0", {
      method: "POST",
      body: JSON.stringify( values ),
    } )
    setTimeout( () => {
      navigateTo( "/login?registerSuccess" )
    }, 3_000 )
  }
</script>

<template>
  <div class="sm:mx-auto sm:w-full sm:max-w-5xl">
    <div>
      <div class="flex flex-shrink-0 justify-center">
        <img
          src="/images/SwimRacing.svg"
          title="Swim.Racing"
          class="w-48"
        >
      </div>
      <h2 class="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
        Register for an Account
      </h2>
    </div>
    <UserForm
      :user="newUser"
      :clubs="[]"
      :swimmers="[]"
      :save-fn="saveUser"
    />
    <p class="mt-10 text-center text-sm text-gray-500">
      Already registered? <nuxt-link
        href="/login"
        class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
      >Login</nuxt-link> to your account.
    </p>
  </div>
</template>
