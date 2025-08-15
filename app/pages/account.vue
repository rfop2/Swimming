<script setup lang="ts">
  import { useForm, useFieldArray } from "vee-validate"
  import { object, array, string, number } from "yup"
  import { toTypedSchema } from "@vee-validate/yup"
  import { CheckIcon, ExclamationTriangleIcon, PencilSquareIcon, TrashIcon, UserPlusIcon, XCircleIcon, XMarkIcon } from "@heroicons/vue/24/outline"

  import type { FetchError } from "ofetch"
  import { COUNTIES, NATIONALITIES, REGIONS, type Swimmer } from "lib"
  import { useDebounceAsync } from "~/composables/useDebounceAsync"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
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

  const { data: userSwimmers } = await useFetch(
    "/api/swimmers",
  )

  const { values, meta, defineField, resetForm, handleSubmit } = useForm( {
    initialValues: {
      firstName: user.value.firstName,
      lastName: user.value.lastName,
      username: user.value.username,
      location: user.value.location,
      password: "************",
      confirmPassword: "************",
      swimmers: userSwimmers.value as Array<Swimmer>,
    },
    validationSchema: toTypedSchema(
      object( {
        firstName: string().required(),
        lastName: string().required(),
        username: string().required(),
        location: string().required(),
        password: string(),
        confirmPassword: string(),
        swimmers: array( object( {
          name: string().required(),
          gender: string().required(),
          birthday: string().required(),
          nationality: string().required(),
          region: string().required(),
          county: string().required(),
          active: number().oneOf( [ 0, 1 ] ).required(),
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

  const editing = ref<number | null>( null )
  const deleting = ref<number | null>( null )

  const errors = reactive<Array<string>>( [] )

  const swimmerData = ref<string | null>( null )
  const editSwimmer = ( swimmerIndex: number ) => {
    editing.value = swimmerIndex
    swimmerData.value = JSON.stringify( fields.value[swimmerIndex].value )
  }

  const resetSwimmer = () => {
    if ( editing.value !== null ) {
      if ( !fields.value[editing.value].value.id ) {
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
      await $fetch( `/api/account/${user.value.id}`, {
        method: "PUT",
        body: JSON.stringify( values ),
      } )
      // await refreshNuxtData()
      resetForm( { values } )
    } catch ( error ) {
      console.error( "Error", error )
      errors[0] = ( error as FetchError ).message ?? null
    }
  } )

  /* watch( [ values, meta ], ( newValues ) => {
    console.log( unref( newValues[0] ), unref( newValues[1] ) )
  } ) */

  const transform = ( input: string ): string => input
    .toLowerCase()
    .replace( /_/g, " " )
    .replace( /\b\w/g, c => c.toUpperCase() )

  const genders = [ {
                      label: "Male",
                      value: "male"
                    },
                    {
                      label: "Female",
                      value: "female"
                    },
  ]
  const nationalities = Object.entries( NATIONALITIES ).map( ( [ value
                                                                 , label ] ) => ( {
                                                                   value,
                                                                   label: transform( label ),
                                                                 } ) )
  const regions = Object.entries( REGIONS ).map( ( [ value, label ] ) => ( {
    value,
    label
  } ) )
  const counties = Object.entries( COUNTIES ).map( ( [ value, label ] ) => ( {
    value,
    label
  } ) )
</script>

<template>
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
              @click="() => {
                push({
                  id: '',
                  name: '',
                  gender: 'male',
                  birthday: '',
                  age: '',
                  nationality: '',
                  region: '',
                  county: '',
                  active: 1,
                });
                editing = fields.length-1;
              }"
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
                      class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                    >
                      Id
                    </th>
                    <th
                      scope="col"
                      class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Gender
                    </th>
                    <th
                      scope="col"
                      class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Birthday
                    </th>
                    <th
                      scope="col"
                      class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Nationality
                    </th>
                    <th
                      scope="col"
                      class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Region
                    </th>
                    <th
                      scope="col"
                      class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      County
                    </th>
                    <th
                      scope="col"
                      class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Active
                    </th>
                    <th
                      scope="col"
                      class="py-3.5 pr-4 pl-3 sm:pr-0"
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
                    <td class="py-4 pr-2 pl-3 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0">
                      <input
                        v-if="editing === swimmerIndex"
                        :id="`swimmer-id-${swimmerIndex}`"
                        v-model="swimmer.value.id"
                        class="block w-full rounded-md bg-white text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      >
                      <span v-else>{{ swimmer.value.id }}</span>
                    </td>
                    <td class="px-2 py-4 text-sm whitespace-nowrap text-gray-500">
                      <input
                        v-if="editing === swimmerIndex"
                        :id="`swimmer-name-${swimmerIndex}`"
                        v-model="swimmer.value.name"
                        class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      >
                      <span v-else>{{ swimmer.value.name }}</span>
                    </td>
                    <td class="px-2 py-4 text-sm whitespace-nowrap text-gray-500">
                      <UI-Select
                        v-if="editing === swimmerIndex"
                        :id="`swimmer-gender-${swimmerIndex}`"
                        v-model="swimmer.value.gender"
                        :options="genders"
                      />
                      <span v-else>{{ genders.find( item => item.value === swimmer.value.gender )?.label }}</span>
                    </td>
                    <td class="px-2 py-4 text-sm whitespace-nowrap text-gray-500">
                      <UI-Input
                        v-if="editing === swimmerIndex"
                        v-model="swimmer.value.birthday"
                        type="date"
                      />
                      <span v-else>{{ swimmer.value.birthday }}</span>
                    </td>
                    <td class="px-2 py-4 text-sm whitespace-nowrap text-gray-500">
                      <UI-Select
                        v-if="editing === swimmerIndex"
                        :id="`swimmer-nationality-${swimmerIndex}`"
                        v-model="swimmer.value.nationality"
                        :options="nationalities"
                      />
                      <span v-else>{{ nationalities.find( item => item.value === swimmer.value.nationality )?.label }}</span>
                    </td>
                    <td class="px-2 py-4 text-sm whitespace-nowrap text-gray-500">
                      <UI-Select
                        v-if="editing === swimmerIndex"
                        :id="`swimmer-region-${swimmerIndex}`"
                        v-model="swimmer.value.region"
                        :options="regions"
                      />
                      <span v-else>{{ regions.find( item => item.value === swimmer.value.region )?.label }}</span>
                    </td>
                    <td class="px-2 py-4 text-sm whitespace-nowrap text-gray-500">
                      <UI-Select
                        v-if="editing === swimmerIndex"
                        :id="`swimmer-county-${swimmerIndex}`"
                        v-model="swimmer.value.county"
                        :options="counties"
                      />
                      <span v-else>{{ counties.find( item => item.value === swimmer.value.county )?.label }}</span>
                    </td>
                    <td class="px-2 py-4 text-sm whitespace-nowrap text-gray-500">
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
                    <td class="py-4 pr-3 pl-2 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
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

                          Edit<span class="sr-only">, {{ swimmer.value.name }}</span>
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
                          Delete<span class="sr-only">, {{ swimmer.value.name }}</span>
                        </button>
                      </div>
                      <div class="flex gap-2 justify-end">
                        <button
                          v-if="editing === swimmerIndex"
                          type="button"
                          class="inline-flex items-center gap-x-1.5 rounded-md bg-lime-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-600"
                          @click="() => { editing = null }"
                        >
                          <CheckIcon
                            class="-ml-0.5 size-5"
                            aria-hidden="true"
                          />
                          Update<span class="sr-only">, {{ swimmer.value.name }}</span>
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
                          Cancel<span class="sr-only">, {{ swimmer.value.name }}</span>
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
      v-if="errors.length"
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
          v-if="errors.length===1"
          class="ml-3"
        >
          <h3 class="text-sm font-medium text-red-800">
            There were errors with your submission
          </h3>
          <div class="mt-2 text-sm text-red-700">
            <p>{{ errors[0] }}</p>
          </div>
        </div>
        <div
          v-else
          class="ml-3"
        >
          <h3 class="text-sm font-medium text-red-800">
            There were {{ errors.length }} errors with your submission
          </h3>
          <div class="mt-2 text-sm text-red-700">
            <ul
              role="list"
              class="list-disc space-y-1 pl-5"
            >
              <li
                v-for="error in errors"
                :key="error"
              >
                {{ error }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 flex items-center justify-end gap-x-6">
      <button
        type="button"
        class="text-sm/6 font-semibold text-gray-900 disabled:text-gray-300"
        :disabled="!meta.dirty"
        @click="() => { resetForm(); editing = null; deleting = null; errors.length = 0 }"
      >
        Reset
      </button>
      <button
        type="submit"
        :disabled="editing !== null || deleting !== null || !meta.dirty || !meta.valid"
        class="rounded-md bg-indigo-600 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Save
      </button>
    </div>
    <UI-Confirm
      v-if="deleting !== null"
      title="Delete swimmer"
      :text="`Are you sure you want to delete swimmer '${fields[deleting].value.name} from your account?`"
      confirm-label="Delete"
      :action="deleteSwimmer"
    />
  </form>
</template>
