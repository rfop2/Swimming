<script lang="ts" setup>
  import type { User } from "lucia"

  useHead( {
    title: "Register",
    meta: [
      { name: "description", content: "Register for an account" }
    ]
  } )

  const config = useRuntimeConfig()

  onMounted( () => {
    if ( import.meta.client && config.public.disableRegistration ) {
      const script = document.createElement( "script" )
      script.src = "https://form.jotform.com/jsform/252743309376361"
      script.async = true
      document.getElementById( "jotform-container" )?.appendChild( script )
    }
  } )

  const user = useUser()
  if ( user.value ) {
    await navigateTo( "/personal-bests" )
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
    <SiteBanner>
      Register for an Account
    </SiteBanner>
    <div v-if="config.public.disableRegistration">
      <p class="mt-2 text-lg/8 text-gray-600 text-center">
        Please complete the form below and we will be in touch with your account details.
      </p>
      <div
        id="jotform-container"
        class="mx-auto max-w-2xl text-center"
      />
    </div>
    <div v-else>
      <UserForm
        :user="newUser"
        :clubs="[]"
        :swimmers="[]"
        :save-fn="saveUser"
      />
    </div>
    <p class="mt-10 text-center text-sm text-gray-500">
      Already registered? <nuxt-link
        href="/login"
        class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
      >Login</nuxt-link> to your account.
    </p>
  </div>
</template>
