<script lang="ts" setup>
  import { useForm } from "vee-validate"
  import * as yup from "yup"
  import { toTypedSchema } from "@vee-validate/yup"
  import type { FetchError } from "ofetch"
  import type { Club, UserClub } from "lib"

  useHead( {
    title: "Contact Us",
    meta: [
      { name: "description", content: "Get in touch with the Swim Racing team" }
    ]
  } )

  const config = useRuntimeConfig()
  const user = useUser()

  const roleOptions = [
    { value: "swimmer", label: "Swimmer" },
    { value: "parent", label: "Parent" },
    { value: "trainer", label: "Trainer" },
    { value: "club-admin", label: "Club Administrator" },
    { value: "other", label: "Other" },
  ]

  const requireCaptcha = computed( () => !user.value )

  const { errors, defineField, handleSubmit, resetForm, setFieldValue } = useForm( {
    initialValues: {
      firstName: user.value?.firstName ?? "",
      lastName: user.value?.lastName ?? "",
      username: user.value?.username ?? "",
      phone: user.value?.phone ?? "",
      role: "",
      club: "",
      message: "",
      captcha: undefined as string | undefined,
    },
    validationSchema: toTypedSchema(
      yup.object( {
        firstName: yup.string().label( "First name" ).required(),
        lastName: yup.string().label( "Last name" ).required(),
        username: yup.string().email().label( "Email address" ).required(),
        phone: yup.string().label( "Phone number" ).required(),
        role: yup.string().label( "Are you a…" ).required(),
        club: yup.string().label( "Swimming club" ).optional(),
        message: yup.string().label( "Message" ).optional(),
        captcha: requireCaptcha.value
          ? yup.string().required( "Captcha is required" )
          : yup.string().optional(),
      } ),
    ),
  } )

  const [ firstName, firstNameAttrs ] = defineField( "firstName" )
  const [ lastName, lastNameAttrs ] = defineField( "lastName" )
  const [ username, usernameAttrs ] = defineField( "username" )
  const [ phone, phoneAttrs ] = defineField( "phone" )
  const [ role, roleAttrs ] = defineField( "role" )
  const [ message, messageAttrs ] = defineField( "message" )
  const [ captcha ] = defineField( "captcha" )

  const clubSelection = ref<string | undefined>( undefined )
  const clubResults = ref<UISelection[]>( [] )

  const searchClubs = async ( search: string ): Promise<UISelection[]> => {
    if ( !search ) return []
    const found = await $fetch<Club[]>( `/api/clubs/search?search=${encodeURIComponent( search )}` )
    clubResults.value = found.map( c => ( { label: c.clubName, value: c.clubId } ) )
    return clubResults.value
  }

  // Pre-fill with the logged-in user's existing club, if they have one
  const { userClubs } = user.value ? useUserClubs() : { userClubs: ref<UserClub[]>( [] ) }

  watch( userClubs, ( clubs ) => {
    const firstClub = clubs?.at( 0 )
    if ( firstClub && !clubSelection.value ) {
      clubResults.value = [ { label: firstClub.clubName, value: firstClub.clubId } ]
      clubSelection.value = firstClub.clubId
    }
  }, { immediate: true } )

  watch( clubSelection, ( value ) => {
    if ( !value ) {
      setFieldValue( "club", "" )
      return
    }
    const found = clubResults.value.find( c => c.value === value )
    setFieldValue( "club", found ? ( found.label ?? String( found.value ) ) : String( value ) )
  } )

  const onCaptchaSolved = ( token: string ) => {
    captcha.value = token
  }

  const turnstile = ref()
  const submitting = ref( false )
  const submitSuccess = ref( false )
  const submitErrorVisible = ref( false )
  const submitError = ref( "" )

  const submit = handleSubmit( async ( values ) => {
    submitting.value = true
    submitError.value = ""
    try {
      await $fetch( "/api/contact", {
        method: "POST",
        body: values,
      } )
      submitSuccess.value = true
      clubSelection.value = undefined
      resetForm( {
        values: {
          ...values,
          role: "",
          club: "",
          message: "",
          captcha: undefined,
        },
      } )
    } catch ( error ) {
      submitError.value = ( error as FetchError ).data?.message ?? "Something went wrong. Please try again."
      submitErrorVisible.value = true
      turnstile.value?.reset()
    } finally {
      submitting.value = false
    }
  } )
</script>

<template>
  <div class="isolate bg-white px-6 py-6 sm:py-8 lg:px-8">
    <div
      class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      aria-hidden="true"
    >
      <div
        class="relative left-1/2 -z-10 aspect-1155/678 w-144.5 max-w-none -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-40rem)] sm:w-288.75"
        style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
      />
    </div>
    <div class="mx-auto mb-2 max-w-2xl text-center">
      <h2 class="text-2xl font-semibold tracking-tight text-balance text-gray-900 sm:text-3xl">
        Contact Us
      </h2>
      <p class="mt-2 text-lg/8 text-gray-600">
        Please complete the form below and we will get back to you as soon as possible.
      </p>
    </div>

    <form
      class="mx-auto mt-10 max-w-2xl"
      novalidate
      @submit.prevent="submit"
    >
      <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
        <div>
          <UI-Input
            v-model="firstName"
            label="Full Name"
            v-bind="firstNameAttrs"
            placeholder="First Name"
            autocomplete="given-name"
            required
            :error="errors.firstName"
          />
        </div>
        <div class="sm:mt-7">
          <UI-Input
            v-model="lastName"
            v-bind="lastNameAttrs"
            placeholder="Last Name"
            autocomplete="family-name"
            required
            :error="errors.lastName"
          />
        </div>

        <div>
          <UI-Input
            v-model="username"
            label="Email Address"
            v-bind="usernameAttrs"
            type="email"
            placeholder="example@example.com"
            autocomplete="email"
            required
            :error="errors.username"
          />
        </div>
        <div>
          <UI-Input
            v-model="phone"
            label="Phone Number"
            v-bind="phoneAttrs"
            type="tel"
            placeholder="Please enter a valid phone number"
            autocomplete="tel"
            required
            :error="errors.phone"
          />
        </div>

        <div class="sm:col-span-2">
          <span class="block text-sm/6 font-medium text-gray-900">Are you a …*</span>
          <div class="mt-2 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <div
              v-for="option in roleOptions"
              :key="option.value"
              class="flex items-center gap-x-2"
            >
              <input
                :id="`role-${option.value}`"
                v-model="role"
                v-bind="roleAttrs"
                type="radio"
                :value="option.value"
                class="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
              >
              <label
                :for="`role-${option.value}`"
                class="block text-sm/6 text-gray-900"
              >{{ option.label }}</label>
            </div>
          </div>
          <p v-if="errors.role" class="mt-2 text-sm text-red-600">
            {{ errors.role }}
          </p>
        </div>

        <div class="sm:col-span-2">
          <UI-Combobox
            v-model="clubSelection"
            label="Swimming Club (if applicable)"
            placeholder="Select or type club name"
            :fetch-options="searchClubs"
            :error="errors.club"
          />
        </div>

        <div class="sm:col-span-2">
          <UI-Input
            v-model="message"
            v-bind="messageAttrs"
            label="Your Message"
            type="textarea"
            rows="4"
            :error="errors.message"
          />
        </div>

        <div
          v-if="requireCaptcha"
          class="sm:col-span-2"
        >
          <ClientOnly>
            <NuxtTurnstile ref="turnstile" v-model="captcha" :site-key="config.public.turnstileSiteKey as string" @update:model-value="onCaptchaSolved" />
          </ClientOnly>
        </div>
      </div>

      <div class="mt-10">
        <button
          type="submit"
          :disabled="submitting"
          class="block w-full rounded-md bg-indigo-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60"
        >
          {{ submitting ? "Sending…" : "Send Enquiry" }}
        </button>
      </div>
    </form>

    <UI-SuccessNotification
      v-model="submitSuccess"
      title="Enquiry sent!"
      text="Thanks for getting in touch, we'll get back to you as soon as possible."
    />
    <UI-ErrorNotification
      v-model="submitErrorVisible"
      title="Unable to send your enquiry"
      :text="submitError"
    />
  </div>
</template>
