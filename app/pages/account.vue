<script setup lang="ts">
  import { useForm, useFieldArray } from "vee-validate"
  import * as yup from "yup"
  import { toTypedSchema } from "@vee-validate/yup"
  import { CheckIcon, ExclamationTriangleIcon, PencilSquareIcon, TrashIcon, UserPlusIcon, XCircleIcon, XMarkIcon } from "@heroicons/vue/24/outline"

  import type { FetchError } from "ofetch"
  import { COUNTIES, NATIONALITIES, REGIONS, type Swimmer } from "lib"
  import { useDebounceAsync } from "~/composables/useDebounceAsync"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Account",
    meta: [
      { name: "description", content: "Edit account details and manage swimmers" }
    ]
  } )

  const user = useAuthenticatedUser()

  const { data: locations } = await useFetch<Array<{lat:string,lon:string}>>(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent( user.value.location + ", UK" )}`
  )
  const locationCoords = ref<{lat?: number, lon?: number}>( {} )
  if ( locations.value !== null && locations.value.length > 0 ) {
    locationCoords.value = { lat: Number( locations.value[0].lat ), lon: Number( locations.value[0].lon ) }
  }

  const lookupLocation = async ( event: InputEvent ): Promise<string[]> => {
    const location = ( event.target as HTMLInputElement )?.value
    const res = await fetch( `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent( location + ", UK" )}` )
    return await res.json()
  }

  const checkLocation = useDebounceAsync( lookupLocation, 500 )

  const { swimmers, refreshSwimmers } = await useSwimmers()

  const PASSWORD = "************"

  const { values, errors, meta, defineField, resetForm, handleSubmit } = useForm( {
    initialValues: {
      firstName: user.value.firstName,
      lastName: user.value.lastName,
      username: user.value.username,
      location: user.value.location,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      swimmers: swimmers.value,
    },
    validationSchema: toTypedSchema(
      yup.object( {
        firstName: yup.string().label( "First name" ).required(),
        lastName: yup.string().label( "Last name" ).required(),
        username: yup.string().email().label( "Email address" ).required(),
        location: yup.string().label( "Town/city" ).required(),
        password: yup.string()
          .test(
            "skip-placeholder-validation",
            "Password must be 8-32 chars, include upper/lowercase, digit & symbol",
            value => {
              if ( !value || value === PASSWORD ) return true
              // Your strict password validation
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
              if ( ( !value || value === PASSWORD ) && ( password === PASSWORD || !password ) ) return true
              // Confirm password only if password field is not the placeholder
              return value === password
            }
          ),
        swimmers: yup.array( yup.object( {
          firstName: yup.string().required(),
          lastName: yup.string().required(),
          gender: yup.string().required(),
          birthday: yup.string().required(),
          nationality: yup.string().required(),
          region: yup.string().required(),
          county: yup.string().required(),
          squad: yup.string(),
          active: yup.number().oneOf( [ 0, 1 ] ).required(),
        } ) )
      } ),
    ),
  } )

  const [ firstName, firstNameAttrs ] = defineField( "firstName" )
  const [ lastName, lastNameAttrs ] = defineField( "lastName" )
  const [ username, usernameAttrs ] = defineField( "username" )
  const [ location, locationAttrs ] = defineField( "location" )
  const [ password, passwordAttrs ] = defineField( "password" )
  const [ confirmPassword, confirmPasswordAttrs ] = defineField( "confirmPassword" )

  const { remove, push, update, fields } = useFieldArray<Swimmer>( "swimmers" )

  const swimmerErrors = ( index: number ) => {
    const prefix = `swimmers[${index}].`
    return Object.keys( errors.value ).some( key => key.startsWith( prefix ) )
  }

  const editing = ref<number | null>( null )
  const deleting = ref<number | null>( null )

  const submitErrors = reactive<Array<string>>( [] )

  const swimmerData = ref<string | null>( null )

  const foundSwimmer = ref<Partial<Swimmer>>( {} )

  const addSwimmer = () => {
    const newSwimmer = {
      ...{
        id: "",
        firstName: "",
        lastName: "",
        gender: "male",
        birthday: "",
        nationality: "",
        region: "",
        county: "",
        squad: "",
        active: 1,
      },
      ...foundSwimmer.value
    }
    console.log( newSwimmer )
    push( newSwimmer  )
    editing.value = fields.value.length - 1
  }

  const editSwimmer = ( swimmerIndex: number ) => {
    editing.value = swimmerIndex
    if ( squads.value.length ) {
      selectedSquad.value = squads.value.find( s => s.value === fields.value[swimmerIndex].value.squad )
    }
    swimmerData.value = JSON.stringify( fields.value[swimmerIndex].value )
  }

  const resetSwimmer = () => {
    if ( editing.value !== null ) {
      if ( fields.value[editing.value].value.id === foundSwimmer.value.id ) {
        remove( editing.value )
      } else if ( swimmerData.value ) {
        update( editing.value, JSON.parse( swimmerData.value ) )
        swimmerData.value = null
      }
    }
    editing.value = null
  }

  const deleteSwimmer = () => {
    if ( deleting.value !== null ) {
      remove( deleting.value )
    }
    deleting.value = null
  }

  const squads = computed( () => Array.from( fields.value.reduce( ( sq, s ) => {
    if ( s.value.squad )
      sq.add( s.value.squad )
    return sq
  }, new Set<string>() ) ).sort().map( s => ( { label: s, value: s } ) ) )
  const selectedSquad = ref<{label: string, value: string} | undefined>()

  watch( selectedSquad, ( v ) => {
    if ( editing.value !== null ) {
      fields.value[editing.value].value.squad = v?.value ?? ""
    }
  } )

  const saveSuccess = ref( false )
  const save = handleSubmit( async ( values ) => {
    try {
      /* const formData: UserUpdate = {
        firstName: unref( firstName ),
        lastName: unref( lastName ),
        username: unref( username ),
        location: unref( location ),
      }
      if ( password.value && !password.value.match( /^\*+$/ )
        && confirmPassword.value && !confirmPassword.value.match( /^\*+$/ )
        && password.value === confirmPassword.value ) {
        formData.password = unref( password )
        formData.confirmPassword = unref( confirmPassword )
      } */
      submitErrors.length = 0
      await $fetch( `/api/account/${user.value.id}`, {
        method: "PUT",
        body: JSON.stringify( values ),
      } )
      // await refreshNuxtData()
      resetForm( { values } )
      await refreshSwimmers()
      saveSuccess.value = true
    } catch ( error ) {
      console.error( "Error", error )
      submitErrors[0] = ( error as FetchError ).message ?? null
    }
  } )

  useUnsavedWarning( () => meta.value.dirty )

  watch( [ values, meta ], ( newValues ) => {
    console.log( "VAL", unref( newValues[0] ), "META", unref( newValues[1] ) )
  } )

  watch( errors, ( newErrors ) => {
    console.log( "ERR", newErrors )
  } )

  const genders =
    [ {
        label: "Open/Male",
        value: "male"
      },
      {
        label: "Female",
        value: "female"
      },
    ]
  const nationalities = Object.entries( NATIONALITIES ).map( (
    [ value , label ] ) => ( {
    value,
    label
  } ) )
  const regions = Object.entries( REGIONS ).map( ( [ value, label ] ) => ( {
    value,
    label
  } ) )
  const counties = Object.entries( COUNTIES ).map( ( [ value, label ] ) => ( {
    value,
    label
  } ) )

  const showLookup = ref<boolean>( false )
  const swimmerId = ref<string>( "" )
  const lookupSwimmer = async () => {
    const url = `https://www.swimmingresults.org/biogs/biogs_details.php?tiref=${swimmerId.value}`
    const doc = await useHtmlFetch( url )
    if ( doc ) {
      const idCell = doc.querySelector( "#outerWrapper > div:nth-child(2) > div.boxRepeat.rankingsContent > div > div:nth-child(1) > div > table:nth-child(3) > tbody > tr:nth-child(2) > td:nth-child(2)" )
      if ( idCell ) {
        foundSwimmer.value.id = idCell.textContent
      }
      const nameCell = doc.querySelector( "#outerWrapper > div:nth-child(2) > div.boxRepeat.rankingsContent > div > div:nth-child(1) > div > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(2)" )
      if ( nameCell ) {
        [ foundSwimmer.value.firstName, foundSwimmer.value.lastName ] = nameCell.textContent.split( /\s+/ )
      }
      const yearCell = doc.querySelector( "#outerWrapper > div:nth-child(2) > div.boxRepeat.rankingsContent > div > div:nth-child(1) > div > table:nth-child(1) > tbody > tr:nth-child(4) > td:nth-child(2)" )
      if ( yearCell ) {
        foundSwimmer.value.birthday = `${yearCell.textContent}-01-01`
      }
      const genderCell = doc.querySelector( "#outerWrapper > div:nth-child(2) > div.boxRepeat.rankingsContent > div > div:nth-child(1) > div > table:nth-child(1) > tbody > tr:nth-child(5) > td:nth-child(2)" )
      if ( genderCell ) {
        const gender = genderCell.textContent.toLocaleLowerCase()
        foundSwimmer.value.gender = gender === "female" ? gender : "male"
      }
      console.log( "N", foundSwimmer )
    }
  }
  watch( showLookup, ( newValue, oldValue ) => {
    if ( newValue && !oldValue ) {
      swimmerId.value = ""
      foundSwimmer.value = {}
    }
  } )
</script>

<template>
  <div>
    <form
      action="#"
      method="POST"
      @submit.prevent="save"
    >
      <div class="space-y-8">
        <div class="border-b border-gray-900/10 pb-12">
          <div class="px-4 sm:px-6 lg:px-8">
            <h2 class="text-base/7 font-semibold text-gray-900">
              Personal Information
            </h2>
            <p class="mt-1 text-sm/6 text-gray-600">
              Update your personal details and the swimmers you wish to follow.
            </p>

            <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div class="sm:col-span-2">
                <label
                  for="first-name"
                  class="block text-sm/6 font-medium text-gray-900"
                >First name</label>
                <div class="mt-2">
                  <input
                    id="first-name"
                    v-model="firstName"
                    v-bind="firstNameAttrs"
                    type="text"
                    autocomplete="given-name"
                    required
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  >
                  <span>{{ errors.firstName }}</span>
                </div>
              </div>

              <div class="sm:col-span-2">
                <label
                  for="last-name"
                  class="block text-sm/6 font-medium text-gray-900"
                >Last name</label>
                <div class="mt-2">
                  <input
                    id="last-name"
                    v-model="lastName"
                    v-bind="lastNameAttrs"
                    type="text"
                    autocomplete="family-name"
                    required
                    class="block w-full rounded-md px-3 py-1.5 sm:text-sm/6"
                  >
                  <span>{{ errors.lastName }}</span>
                </div>
              </div>

              <div class="sm:col-span-2 sm:col-start-1">
                <label
                  for="email"
                  class="block text-sm/6 font-medium text-gray-900"
                >Email address</label>
                <div class="mt-2">
                  <input
                    id="email"
                    v-model="username"
                    v-bind="usernameAttrs"
                    type="email"
                    autocomplete="email"
                    required
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  >
                  <span>{{ errors.username }}</span>
                </div>
              </div>

              <div class="sm:col-span-2">
                <label
                  for="password"
                  class="block text-sm/6 font-medium text-gray-900"
                >Password</label>
                <div class="mt-2">
                  <input
                    id="password"
                    v-model="password"
                    v-bind="passwordAttrs"
                    type="password"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  >
                  <span>{{ errors.password }}</span>
                </div>
              </div>

              <div class="sm:col-span-2">
                <label
                  for="confirm-password"
                  class="block text-sm/6 font-medium text-gray-900"
                >Confirm Password</label>
                <div class="mt-2">
                  <input
                    id="confirm-password"
                    v-model="confirmPassword"
                    v-bind="confirmPasswordAttrs"
                    type="password"
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  >
                  <span>{{ errors.confirmPassword }}</span>
                </div>
              </div>

              <div class="sm:col-span-2 sm:col-start-1">
                <label
                  for="city"
                  class="block text-sm/6 font-medium text-gray-900"
                >Town / City (for distance calculations)</label>
                <div class="mt-2">
                  <div class="relative">
                    <input
                      id="city"
                      v-model="location"
                      v-bind="locationAttrs"
                      type="text"
                      autocomplete="address-level2"
                      class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      @input="checkLocation"
                    >
                    <button
                      type="button"
                      class="absolute top-1/2 right-2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <CheckIcon
                        v-if="locationCoords.lat && locationCoords.lon"
                        class="text-green-400 block h-6 w-6"
                      />
                      <ExclamationTriangleIcon
                        v-if="!locationCoords.lat || !locationCoords.lon"
                        class="text-red-400 block h-6 w-6"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="border-b border-gray-900/10 pt-8 pb-12">
        <div class="px-4 sm:px-6 lg:px-8">
          <div class="sm:flex sm:items-center">
            <div class="sm:flex-auto">
              <h1 class="text-base font-semibold text-gray-900">
                Swimmers
              </h1>
              <p class="mt-2 text-sm text-gray-700">
                A list of the swimmers to track on your account.
              </p>
            </div>
            <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <button
                type="button"
                class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                @click="showLookup = true"
              >
                <UserPlusIcon
                  class="-ml-0.5 size-5"
                  aria-hidden="true"
                />
                Add swimmer
              </button>
            </div>
          </div>
          <div class="mt-8 flow-root">
            <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table class="relative min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        class="py-3.5 pr-1 pl-2 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                      >
                        Id
                      </th>
                      <th
                        scope="col"
                        class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        First Name
                      </th>
                      <th
                        scope="col"
                        class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Last Name
                      </th>
                      <th
                        scope="col"
                        class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Gender
                      </th>
                      <th
                        scope="col"
                        class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Birthday
                      </th>
                      <th
                        scope="col"
                        class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Nationality
                      </th>
                      <th
                        scope="col"
                        class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Region
                      </th>
                      <th
                        scope="col"
                        class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        County
                      </th>
                      <th
                        scope="col"
                        class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Squad
                      </th>
                      <th
                        scope="col"
                        class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Active
                      </th>
                      <th
                        scope="col"
                        class="py-1.5 pr-2 pl-1 sm:pr-0"
                      >
                        <span class="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr
                      v-for="(swimmer, swimmerIndex) in fields"
                      :key="swimmer.value.id"
                    >
                      <td class="py-1 pr-1 pl-2 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0">
                        <input
                          v-if="editing === swimmerIndex"
                          :id="`swimmer-id-${swimmerIndex}`"
                          v-model="swimmer.value.id"
                          class="block w-full rounded-md bg-white text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        >
                        <span v-else>{{ swimmer.value.id }}</span>
                      </td>
                      <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                        <input
                          v-if="editing === swimmerIndex"
                          :id="`swimmer-firstname-${swimmerIndex}`"
                          v-model="swimmer.value.firstName"
                          class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        >
                        <span v-else>{{ swimmer.value.firstName }}</span>
                      </td>
                      <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                        <input
                          v-if="editing === swimmerIndex"
                          :id="`swimmer-lastname-${swimmerIndex}`"
                          v-model="swimmer.value.lastName"
                          class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        >
                        <span v-else>{{ swimmer.value.lastName }}</span>
                      </td>
                      <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                        <UI-Select
                          v-if="editing === swimmerIndex"
                          :id="`swimmer-gender-${swimmerIndex}`"
                          v-model="swimmer.value.gender"
                          :options="genders"
                        />
                        <span v-else>{{ genders.find( item => item.value === swimmer.value.gender )?.label }}</span>
                      </td>
                      <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                        <UI-Input
                          v-if="editing === swimmerIndex"
                          v-model="swimmer.value.birthday"
                          type="date"
                        />
                        <span v-else>{{ swimmer.value.birthday }}</span>
                      </td>
                      <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                        <UI-Select
                          v-if="editing === swimmerIndex"
                          :id="`swimmer-nationality-${swimmerIndex}`"
                          v-model="swimmer.value.nationality"
                          :options="nationalities"
                        />
                        <span v-else>{{ nationalities.find( item => item.value === swimmer.value.nationality )?.label }}</span>
                      </td>
                      <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                        <UI-Select
                          v-if="editing === swimmerIndex"
                          :id="`swimmer-region-${swimmerIndex}`"
                          v-model="swimmer.value.region"
                          :options="regions"
                        />
                        <span v-else>{{ regions.find( item => item.value === swimmer.value.region )?.label }}</span>
                      </td>
                      <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                        <UI-Select
                          v-if="editing === swimmerIndex"
                          :id="`swimmer-county-${swimmerIndex}`"
                          v-model="swimmer.value.county"
                          :options="counties"
                        />
                        <span v-else>{{ counties.find( item => item.value === swimmer.value.county )?.label }}</span>
                      </td>
                      <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                        <UI-Combobox
                          v-if="editing === swimmerIndex"
                          :id="`swimmer-squad-${swimmerIndex}`"
                          v-model="selectedSquad"
                          :options="squads"
                        />
                        <span v-else>{{ swimmer.value.squad }}</span>
                      </td>
                      <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                        <input
                          v-if="editing === swimmerIndex"
                          v-model="swimmer.value.active"
                          type="checkbox"
                          :true-value="1"
                          :false-value="0"
                        >
                        <span v-else>
                          <CheckIcon
                            v-if="!!swimmer.value.active"
                            class="block h-6 w-6"
                          />
                          <XMarkIcon
                            v-if="!swimmer.value.active"
                            class="block h-6 w-6"
                          />
                        </span>
                      </td>
                      <td class="py-2 pr-2 pl-1 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                        <div class="flex gap-2 justify-end">
                          <button
                            v-if="editing !== swimmerIndex"
                            type="button"
                            :disabled="editing !== null && editing !== swimmerIndex"
                            class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            @click="() => editSwimmer( swimmerIndex )"
                          >
                            <PencilSquareIcon
                              class="-ml-0.5 size-5"
                              aria-hidden="true"
                            />

                            <span class="sr-only">Edit, {{ swimmer.value.fullName }}</span>
                          </button>
                          <button
                            v-if="editing !== swimmerIndex"
                            type="button"
                            :disabled="editing !== null && editing !== swimmerIndex"
                            class="inline-flex items-center gap-x-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                            @click="() => { deleting = swimmerIndex }"
                          >
                            <TrashIcon
                              class="-ml-0.5 size-5"
                              aria-hidden="true"
                            />
                            <span class="sr-only">Delete, {{ swimmer.value.fullName }}</span>
                          </button>
                        </div>
                        <div class="flex gap-2 justify-end">
                          <button
                            v-if="editing === swimmerIndex"
                            type="button"
                            class="inline-flex items-center gap-x-1.5 rounded-md bg-lime-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-600  disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                            :disabled="swimmerErrors(swimmerIndex)"
                            @click="() => { editing = null }"
                          >
                            <CheckIcon
                              class="-ml-0.5 size-5"
                              aria-hidden="true"
                            />
                            <span class="sr-only">Update, {{ swimmer.value.fullName }}</span>
                          </button>
                          <button
                            v-if="editing === swimmerIndex"
                            type="button"
                            class="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            @click="() => resetSwimmer()"
                          >
                            <XMarkIcon
                              class="-ml-0.5 size-5"
                              aria-hidden="true"
                            />
                            <span class="sr-only">Cancel Editing, {{ swimmer.value.fullName }}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
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
          type="button"
          class="text-sm/6 font-semibold text-gray-900 disabled:text-gray-300"
          :disabled="!meta.dirty"
          @click="() => { resetForm(); editing = null; deleting = null; submitErrors.length = 0 }"
        >
          Reset
        </button>
        <button
          type="submit"
          :disabled="editing !== null || deleting !== null || !meta.dirty || !!Object.entries(errors).length"
          class="rounded-md bg-indigo-600 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Save
        </button>
      </div>

      <div class="hidden sm:flex sticky bottom-0 bg-white border-t p-4 justify-end gap-x-6">
        <button
          type="button"
          class="text-sm/6 font-semibold text-gray-900 disabled:text-gray-300"
          :disabled="!meta.dirty"
          @click="() => { resetForm(); editing = null; deleting = null; submitErrors.length = 0 }"
        >
          Reset
        </button>
        <button
          type="submit"
          :disabled="editing !== null || deleting !== null || !meta.dirty || !!Object.entries(errors).length"
          class="rounded-md bg-indigo-600 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Save
        </button>
      </div>

      <UI-Confirm
        v-if="deleting !== null"
        title="Delete swimmer"
        :text="`Are you sure you want to delete swimmer '${fields[deleting].value.fullName}' from your account?`"
        confirm-label="Delete"
        :action="deleteSwimmer"
      />
      <UI-Dialog
        v-model="showLookup"
        title="Lookup swimmer"
        confirm-label="Select"
        :confirm-enabled="() => !!foundSwimmer.id"
        :action="async () => { await addSwimmer() }"
      >
        <div class="px-3 py-5 sm:p-6">
          <div class="mt-2 max-w-xl text-sm text-gray-500">
            <p>Enter a swimmer id to lookup details.</p>
          </div>
          <form class="mt-5 sm:flex sm:items-center">
            <div class="w-full sm:max-w-xs">
              <input
                id="swimmerId"
                v-model="swimmerId"
                type="text"
                aria-label="Swimmer Id"
                class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600  sm:text-sm/6"
                placeholder="1234567890"
              >
            </div>
            <button
              type="button"
              class="mt-3 inline-flex w-full items-center justify-center rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600  disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed sm:ml-3 sm:mt-0 sm:w-auto"
              :disabled="!swimmerId.length"
              @click="lookupSwimmer"
            >
              Lookup
            </button>
          </form>
          <div
            v-if="foundSwimmer.id"
            class="mt-2 max-w-xl text-sm text-gray-500"
          >
            <p>
              Found - {{ foundSwimmer.firstName }} {{ foundSwimmer.lastName }} ({{ foundSwimmer.birthday?.substring( 0, 4 ) }}) click 'Select' to continue,
            </p>
          </div>
        </div>
      </UI-Dialog>
    </form>
    <UI-SuccessNotification
      v-model="saveSuccess"
      title="Successfully saved!"
      text="Account details have been updated."
    />
  </div>
</template>
