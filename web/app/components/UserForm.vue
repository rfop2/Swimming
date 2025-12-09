<script setup lang="ts">
  import { useForm, useFieldArray, type FieldEntry } from "vee-validate"
  import * as yup from "yup"
  import { toTypedSchema } from "@vee-validate/yup"
  import { CheckIcon, ExclamationTriangleIcon, PencilSquareIcon, TrashIcon, UserGroupIcon, UserPlusIcon, XCircleIcon } from "@heroicons/vue/24/outline"

  import type { FetchError } from "ofetch"
  import { COUNTIES, NATIONALITIES, REGIONS } from "lib"
  import type { Club, ExtSwimmer, Task, UserClub } from "lib"
  import { useDebounceAsync } from "~/composables/useDebounceAsync"
  import type { User } from "lucia"

  const props = defineProps<{
    user: User
    clubs: UserClub[]
    swimmers: ExtSwimmer[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveFn: ( values: any ) => Promise<void>
  }>()

  const clubLookups: Array<UserClub | Club> = props.clubs

  const currentUser = useAuthenticatedUser()
  const isAdmin = !!Number( currentUser.value.admin )
  const editingSelf = currentUser.value.id === props.user.id

  const { data: locations } = await useFetch<Array<{ lat: string, lon: string }>>(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent( props.user.location + ", UK" )}`,
    {
      default: () => [],
    }
  )
  const locationCoords = ref<{ lat?: number, lon?: number }>( {} )
  const locationFound = locations.value.at( 0 )
  if ( locationFound ) {
    locationCoords.value = { lat: Number( locationFound.lat ), lon: Number( locationFound.lon ) }
  }

  const lookupLocation = async ( event: InputEvent ): Promise<string[]> => {
    const location = ( event.target as HTMLInputElement )?.value
    const res = await fetch( `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent( location + ", UK" )}` )
    return await res.json()
  }

  const checkLocation = useDebounceAsync( lookupLocation, 500 )

  const PASSWORD = "************"

  const initialValues = computed( () => ( {
    firstName: props.user.firstName,
    lastName: props.user.lastName,
    username: props.user.username,
    password: props.user.id !== "0" ? PASSWORD : "",
    confirmPassword: props.user.id !== "0" ? PASSWORD : "",
    phone: props.user.phone,
    location: props.user.location,
    type: props.user.type,
    clubs: props.clubs.map( ( { clubId, clubOwner } ) => ( { clubId, clubOwner } ) ), // Filter out the other fields
    swimmers: props.swimmers,
  } ) )

  // If the parent sends new values… reset the form
  watch(
    () => initialValues.value,
    ( newValues ) => {
      resetForm( {
        values: newValues,
      } )
    },
    { deep: true }
  )

  const { values, errors, meta, defineField, resetForm, handleSubmit } = useForm( {
    initialValues: initialValues.value,
    validationSchema: toTypedSchema(
      yup.object( {
        firstName: yup.string().label( "First name" ).required(),
        lastName: yup.string().label( "Last name" ).required(),
        username: yup.string().email().label( "Email address" ).required(),
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
        phone: yup.string().label( "Phone / Mobile" ),
        location: yup.string().label( "Town / City" ).required(),
        type: yup.string().label( "Type" ).when( [], ( /* _values, _schema */ ) => {
          return isAdmin
            ? yup.string().required()
            : yup.string().notRequired()
        } ),
        clubs: yup.array( yup.object( {
          clubId: yup.string().required(),
          clubOwner: yup.number().required(),
        } ) ),
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
  const [ password, passwordAttrs ] = defineField( "password" )
  const [ confirmPassword, confirmPasswordAttrs ] = defineField( "confirmPassword" )
  const [ phone, phoneAttrs ] = defineField( "phone" )
  const [ location, locationAttrs ] = defineField( "location" )
  const [ type, typeAttrs ] = defineField( "type" )
  const { replace: replaceUserClub } = useFieldArray<UserClub>( "clubs" )
  const { remove: removeSwimmer, push: pushSwimmer, update: updateSwimmer, fields: userSwimmers } = useFieldArray<ExtSwimmer>( "swimmers" )

  // Should come from DB
  const userTypes =
    [
      {
        label: "Parent",
        value: "parent"
      },
      {
        label: "Trainer",
        value: "trainer"
      },
      {
        label: "Club",
        value: "club"
      },
      {
        label: "Other",
        value: "other"
      },
    ]

  const swimmerErrors = ( index: number ) => {
    const prefix = `swimmers[${index}].`
    return Object.keys( errors.value ).some( key => key.startsWith( prefix ) )
  }

  const editing = ref<number | null>( null )
  const deleting = ref<number | null>( null )

  const submitErrors = reactive<Array<string>>( [] )

  const swimmerData = ref<string | null>( null )

  const addSwimmer = ( foundSwimmer: Partial<ExtSwimmer> ) => {
    const newSwimmer = {
      ...{
        id: "",
        firstName: "",
        middleName: "",
        lastName: "",
        gender: "male",
        birthday: "",
        nationality: "",
        region: "",
        county: "",
        clubId: "",
        clubIds: "",
        rankedClub: 0,
        rankedClubs: "",
        squad: "",
        squads: "",
        active: 1,
        added: true,
      },
      ...foundSwimmer
    }
    console.log( "New Swimmer", newSwimmer )
    pushSwimmer( newSwimmer )
    editSwimmer( userSwimmers.value.length - 1 )
  }

  const selectedSwimmer: Ref<FieldEntry<ExtSwimmer> | null> = ref( null )
  const editingSwimmer = ref( false )

  const editSwimmer = async ( swimmerIndex: number ) => {
    editing.value = swimmerIndex
    const userSwimmer = userSwimmers.value.at( swimmerIndex )
    if ( userSwimmer ) {
      if ( squads.value.length ) {
        selectedSquad.value = squads.value.find( s => s.value === userSwimmer.value.squad )
      }
      selectedSwimmer.value = userSwimmer
      editingSwimmer.value = true
      if ( selectedSwimmer.value.value.clubId ) {
        const club: Club | undefined = await $fetch( `/api/clubs/${selectedSwimmer.value.value.clubId}` )
        swimmerClub.value = club ? { label: club.clubName, value: club.clubId } : undefined
      }
      swimmerData.value = JSON.stringify( userSwimmer.value )
    }
  }

  const resetSwimmer = () => {
    if ( editing.value !== null ) {
      const userSwimmer = userSwimmers.value.at( editing.value )
      if ( userSwimmer )
        // Bit of a hack
        if ( ( userSwimmer.value as ExtSwimmer & { added: boolean } ).added ) {
          removeSwimmer( editing.value )
        } else if ( swimmerData.value ) {
          updateSwimmer( editing.value, JSON.parse( swimmerData.value ) )
          swimmerData.value = null
        }
    }
    editing.value = null
  }

  const deleteSwimmer = () => {
    if ( deleting.value !== null ) {
      removeSwimmer( deleting.value )
    }
    deleting.value = null
  }

  const swimmerClub = ref<UISelection | undefined>()

  const squads = computed( () => Array.from( userSwimmers.value.reduce( ( sq, s ) => {
    if ( s.value.squad )
      sq.add( s.value.squad )
    return sq
  }, new Set<string>() ) ).sort().map( s => ( { label: s, value: s } ) ) )
  const selectedSquad = ref<{ label: string, value: string } | undefined>()

  watch( selectedSquad, ( v ) => {
    if ( editing.value !== null ) {
      const userSwimmer = userSwimmers.value.at( editing.value )
      if ( userSwimmer ) {
        userSwimmer.value.squad = v?.value ?? ""
      }
    }
  } )

  const firstClub = computed( () => props.clubs.at( 0 ) )
  const userClubId = ref<string | undefined>( firstClub.value ? firstClub.value.clubId : undefined )
  const userClubName = ref<string | undefined>()
  watchEffect( () => {
    userClubName.value = props.clubs.find( c => c.clubId === userClubId.value )?.clubName
  } )
  const clubOwner = ref<0 | 1>( firstClub.value && firstClub.value.clubOwner ? 1 : 0 )

  watchEffect( () => {
    if ( userClubId.value ) {
      replaceUserClub( [ {
        clubId: String( userClubId.value ),
        clubOwner: clubOwner.value,
      } ] )
    } else {
      replaceUserClub( [] )
    }
  } )

  const searchClubs = async ( query: string ) => {
    if ( !query ) return []
    const res = await $fetch( `/api/clubs/search?search=${encodeURIComponent( query )}` )
    const foundClubs = res.map( ( u: Club ) => ( {
      label: u.clubName,
      value: u.clubId,
    } ) )
    clubLookups.push( ...res )
    return foundClubs
  }
  const saveSuccess = ref( false )
  const save = handleSubmit( async () => {
    try {
      submitErrors.length = 0
      await props.saveFn( values )
      resetForm( { values } )
      saveSuccess.value = true
    } catch ( error ) {
      console.error( "Error", error )
      submitErrors[0] = ( error as FetchError ).message ?? null
    }
  } )

  useUnsavedWarning( () => meta.value.dirty )

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
      } ]
  const nationalities = Object.entries( NATIONALITIES ).map( (
    [ value, label ] ) => ( {
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

  const { createTask } = useTasks()
  const addClubSwimmers = async () => {
    if ( userClubId.value ) {
      try {
        const task: Partial<Task> = {
          taskType: "add",
          taskOptions: JSON.stringify( { club: userClubId.value as string } ),
          taskDescription: `Add club swimmers for '${userClubName.value}' to account`,
          targetType: "user",
          targetId: props.user.id,
        }
        await createTask( task )
        showAlert( "Swimmers are being added to account, please check back shortly", "info" )
      } catch ( error ) {
        console.error( "Error", error )
        showAlert( `Unable to add swimmers to account '${( error as FetchError ).message}'`, "error" )
        throw createError( error as FetchError )
      }
    }
  }

  watch( selectedSwimmer, ( newValue, oldValue ) => {
    if ( newValue && oldValue ) {
      if ( !!newValue.value.clubId && !oldValue.value.clubId ) {
        newValue.value.rankedClub = 1
      }
    }
  }, { deep: true } )
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
            Update {{ editingSelf ? "your personal" : "user" }} details and the swimmers {{ editingSelf ? "you wish" : "for the user" }} to follow.
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

            <div class="sm:col-span-2">
              <label
                for="last-name"
                class="block text-sm/6 font-medium text-gray-900"
              >Phone / Mobile</label>
              <div class="mt-2">
                <input
                  id="phone"
                  v-model="phone"
                  v-bind="phoneAttrs"
                  type="text"
                  autocomplete="tel"
                  class="block w-full rounded-md px-3 py-1.5 sm:text-sm/6"
                >
                <span>{{ errors.phone }}</span>
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
            <div
              v-if="isAdmin"
              class="sm:col-span-1"
            >
              <UI-Select
                id="type"
                v-model="type"
                label="Type"
                v-bind="typeAttrs"
                :options="userTypes"
              />
            </div>
            <div
              class="sm:col-span-2"
            >
              <UI-Combobox
                id="club"
                v-model="userClubId"
                label="Club"
                placeholder="Select or type club name"
                :options="props.clubs.map( c => ({ label: c.clubName, value: c.clubId }))"
                :fetch-options="searchClubs"
              />
            </div>
            <div
              v-if="isAdmin"
              class="sm:col-span-1"
            >
              <UI-input
                v-model="clubOwner"
                type="checkbox"
                label="Club Admin"
                :disabled="!userClubId"
                :true-value="1"
                :false-value="0"
              />
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
              A list of the swimmers to track on {{ editingSelf ? "your" : "the user's" }} account. Please ensure all birthdays are filled in order that the appropriate qualifying and competition times are used.
            </p>
          </div>
          <div class="mt-4 sm:mt-0 sm:ml-8 sm:flex-none">
            <button
              v-if="userClubId && clubOwner"
              type="button"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              @click="addClubSwimmers"
            >
              <UserGroupIcon
                class="-ml-0.5 size-5"
                aria-hidden="true"
              />
              Add all club swimmers
            </button>
          </div>
          <div class="mt-4 sm:mt-0 sm:ml-8 sm:flex-none">
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
                      Club
                    </th>
                    <th
                      scope="col"
                      class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Squad
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
                    v-for="(swimmer, swimmerIndex) in userSwimmers"
                    :key="swimmer.value.id"
                    :class="`active-${swimmer.value.active}`"
                  >
                    <td class="py-1 pr-1 pl-2 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0">
                      {{ swimmer.value.id }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ swimmer.value.firstName }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ swimmer.value.lastName }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ genders.find( item => item.value === swimmer.value.gender )?.label }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ swimmer.value.birthday }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ nationalities.find( item => item.value === swimmer.value.nationality )?.label }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ regions.find( item => item.value === swimmer.value.region )?.label }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ counties.find( item => item.value === swimmer.value.county )?.label }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ clubs.find( c => c.clubId === swimmer.value.clubId )?.clubName }}
                    </td>
                    <td class="px-1 py-2 text-sm whitespace-nowrap text-gray-500">
                      {{ swimmer.value.squad }}
                    </td>
                    <td class="py-2 pr-2 pl-1 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                      <div class="flex gap-2 justify-end">
                        <button
                          type="button"
                          :disabled="editing !== null && editing !== swimmerIndex"
                          class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-2 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                          @click="() => editSwimmer( swimmerIndex )"
                        >
                          <PencilSquareIcon
                            class="size-5"
                            aria-hidden="true"
                          />
                          <span class="sr-only">Edit, {{ swimmer.value.fullName }}</span>
                        </button>
                        <button
                          type="button"
                          :disabled="editing !== null && editing !== swimmerIndex"
                          class="inline-flex items-center gap-x-1.5 rounded-md bg-red-600 px-2 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                          @click="() => { deleting = swimmerIndex }"
                        >
                          <TrashIcon
                            class="size-5"
                            aria-hidden="true"
                          />
                          <span class="sr-only">Delete, {{ swimmer.value.fullName }}</span>
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
  </form>

  <UI-Confirm
    v-if="deleting !== null"
    title="Delete swimmer"
    :text="`Are you sure you want to delete swimmer '${userSwimmers[deleting!]!.value.fullName}' from your account?`"
    confirm-label="Delete"
    :action="deleteSwimmer"
    :cancel-action="() => { deleting = null }"
  />

  <SwimmerFinder
    v-model="showLookup"
    :clubs="props.clubs"
    :action="async ( foundSwimmer: Partial<ExtSwimmer> ) => { await addSwimmer( foundSwimmer ) }"
  />

  <UI-Dialog
    v-model="editingSwimmer"
    title="Edit Swimmer"
    confirm-label="Update"
    :confirm-enabled="() => !swimmerErrors(editing!)"
    :action="() => { editing = null }"
    :cancel-action="() => resetSwimmer()"
  >
    <div class="px-3 py-5 sm:p-4">
      <form
        v-if="selectedSwimmer"
        class="sm:flex sm:items-center"
      >
        <div class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-6">
          <div class="sm:col-span-3">
            <UI-Input
              v-model="selectedSwimmer.value.id"
              label="Swimmer Id"
              required
            />
          </div>
          <div class="hidden sm:block sm:col-span-2" />
          <div class="sm:col-span-1">
            <UI-Input
              v-model="selectedSwimmer.value.active"
              label="Active"
              type="checkbox"
              :true-value="1"
              :false-value="0"
            />
          </div>
          <div class="sm:col-span-3">
            <UI-Input
              v-model="selectedSwimmer.value.firstName"
              label="First Name"
              required
            />
          </div>
          <div class="sm:col-span-3">
            <UI-Input
              v-model="selectedSwimmer.value.lastName"
              label="Last Name"
              required
            />
          </div>
          <div class="sm:col-span-3">
            <UI-Select
              v-model="selectedSwimmer.value.gender"
              label="Gender"
              required
              :options="genders"
            />
          </div>
          <div class="sm:col-span-3">
            <UI-Input
              v-model="selectedSwimmer.value.birthday"
              label="Birthday"
              type="date"
              required
            />
          </div>
          <div class="sm:col-span-3">
            <UI-Select
              v-model="selectedSwimmer.value.nationality"
              label="Nationality"
              required
              :options="nationalities"
            />
          </div>
          <div class="sm:col-span-3">
            <UI-Select
              v-model="selectedSwimmer.value.region"
              label="Region"
              required
              :options="regions"
            />
          </div>
          <div class="sm:col-span-4">
            <UI-Select
              v-model="selectedSwimmer.value.county"
              label="County"
              required
              :options="counties"
            />
          </div>
          <div class="sm:col-span-5">
            <UI-Combobox
              v-model="selectedSwimmer.value.clubId"
              label="Club"
              placeholder="Select or type club name"
              :options="props.clubs.map( c => ({ label: c.clubName, value: c.clubId }))"
              :fetch-options="searchClubs"
              @update:model-value="( value ) => { if ( value && selectedSwimmer ) selectedSwimmer.value.rankedClub = 1 }"
            />
          </div>
          <div class="sm:col-span-1">
            <UI-Input
              v-model="selectedSwimmer.value.rankedClub"
              label="Ranked"
              type="checkbox"
              :disabled="!selectedSwimmer.value.clubId"
              :true-value="1"
              :false-value="0"
            />
          </div>
          <div
            v-if="userClubId && !selectedSwimmer.value.clubId"
            class="sm:col-span-6"
          >
            <button
              type="button"
              class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              @click="swimmerClub?.value === userClubId"
            >
              Set to {{ userClubName }}
            </button>
          </div>
          <div class="sm:col-span-3">
            <UI-Combobox
              v-model="selectedSwimmer.value.squad"
              :disabled="!clubOwner"
              label="Squad"
              :strict="false"
              :options="squads"
            />
          </div>
          <div class="sm:col-span-6">
            {{ swimmerErrors( editing! ) }}
            {{ errors }}
          </div>
        </div>
      </form>
    </div>
  </UI-Dialog>
  <UI-SuccessNotification
    v-model="saveSuccess"
    title="Successfully saved!"
    text="Account details have been updated."
  />
</template>

<style lang="scss">
tr {
  &.active-0 {
    td {
      font-style: italic;
    }
  }
}
</style>
