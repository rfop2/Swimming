<script setup lang="ts">
  import { useForm, useFieldArray, type FieldEntry } from "vee-validate"
  import * as yup from "yup"
  import { toTypedSchema } from "@vee-validate/yup"
  import { PencilSquareIcon, TrashIcon, UserGroupIcon, UserPlusIcon, XCircleIcon } from "@heroicons/vue/24/outline"

  import type { FetchError } from "ofetch"
  import { COUNTIES, NATIONALITIES, REGIONS } from "lib"
  import type { Club, ExtSwimmer, Task, UserClub, UserAttribute } from "lib"
  import type { User } from "lucia"

  const props = defineProps<{
    user: User
    clubs: UserClub[]
    swimmers: ExtSwimmer[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveFn: ( values: any ) => Promise<void>
  }>()

  const config = useRuntimeConfig()

  const { createNotification } = useNotifications()

  const currentUser = useUser()
  const isAdmin = currentUser.value?.role === "admin"
  const editingSelf = computed( () => !currentUser.value || ( currentUser.value.id === props.user.id ) )
  const showAdminAttributes = computed( () => isAdmin && !editingSelf.value )

  const locations = ref<{ place_id: number, name: string, display_name: string }[]>( [] )
  const searchLocation = async ( location: string  ): Promise<UISelection[]> => {
    if ( !location )
      return Promise.resolve( [] )
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&city=${encodeURIComponent( location )}&countrycodes=gb&layer=address&addressdetails=1`
    )

    locations.value = await res.json()
    const locationOptions = locations.value.map( l => ( {
      label: l.display_name,
      value: l.place_id,
    } ) )
    return locationOptions
  }

  const PASSWORD = "************"

  const isNewUser = computed( () => props.user.id === "0" )
  const isRegistering = computed( () => isNewUser.value && editingSelf.value )

  const showSetupEmailToggle = computed( () => isNewUser.value && isAdmin )
  const sendSetupEmail = ref<0 | 1>( 1 )
  const hidePasswordFields = computed( () => showSetupEmailToggle.value && !!sendSetupEmail.value )
  const passwordRequired = computed( () => isRegistering.value || ( isNewUser.value && isAdmin && !sendSetupEmail.value ) )

  const initialValues = computed( () => ( {
    firstName: props.user.firstName,
    lastName: props.user.lastName,
    username: props.user.username,
    password: isNewUser.value ? "" : PASSWORD,
    confirmPassword: isNewUser.value ? "" : PASSWORD,
    captcha: undefined,
    phone: props.user.phone,
    location: props.user.location,
    locationId: props.user.locationId,
    clubs: props.clubs.map( ( { clubId, clubOwner } ) => ( { clubId, clubOwner } ) ), // Filter out the other fields
    swimmers: props.swimmers,
    attributes: props.user.attributes ?? [],
  } ) )

  // If the parent sends new values… reset the form
  watch(
    () => initialValues.value,
    ( newValues ) => {
      console.log( "Resetting", initialValues.value )
      resetForm( {
        values: newValues,
      } )
    },
    { deep: true }
  )

  const userFormSchema = yup.object( {
    firstName: yup.string().label( "First name" ).required(),
    lastName: yup.string().label( "Last name" ).required(),
    username: yup.string().email().label( "Email address" ).required(),
    password: yup.string()
      .test(
        "skip-placeholder-validation",
        "Password must be 8-32 chars, include upper/lowercase, digit & symbol",
        value => {
          if ( passwordRequired.value && !value ) return false
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
          if ( passwordRequired.value && !value ) return false
          if ( ( !value || value === PASSWORD ) && ( password === PASSWORD || !password ) ) return true
          // Confirm password only if password field is not the placeholder
          return value === password
        }
      ),
    captcha: isRegistering.value
      ? yup.string().required( "Captcha is required" )
      : yup.string().optional(),
    phone: yup.string().label( "Phone / Mobile" ),
    location: yup.string().label( "Town / City" ).optional(),
    locationId: yup.number().label( "Town / City" ).required(),
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
    } ) ),
    attributes: yup.array( yup.string().required() ).optional(),
  } )

  const { values, errors, meta, defineField, setFieldValue, setTouched, resetForm, handleSubmit } = useForm( {
    initialValues: initialValues.value,
    validationSchema: toTypedSchema( userFormSchema ),
  } )

  // vee-validate only tracks errors for fields that have already been touched/validated,
  // so `errors`/`meta.valid` stay optimistic for required fields (e.g. locationId via
  // UI-Combobox) the user hasn't interacted with yet. Validate the schema directly against
  // the live values so the submit button reflects real validity regardless of touch state.
  const isFormValid = computed( () => {
    try {
      return userFormSchema.isValidSync( values )
    } catch {
      return false
    }
  } )

  const [ firstName, firstNameAttrs ] = defineField( "firstName" )
  const [ lastName, lastNameAttrs ] = defineField( "lastName" )
  const [ username, usernameAttrs ] = defineField( "username" )
  const [ password, passwordAttrs ] = defineField( "password" )
  const [ confirmPassword, confirmPasswordAttrs ] = defineField( "confirmPassword" )
  const [ captcha ] = defineField( "captcha" )
  const [ phone, phoneAttrs ] = defineField( "phone" )
  // const [ location ] = defineField( "location" )
  const [ locationId, locationIdAttrs ] = defineField( "locationId" )
  const { replace: replaceUserClub } = useFieldArray<UserClub>( "clubs" )
  const { remove: removeSwimmer, push: pushSwimmer, update: updateSwimmer, fields: userSwimmers } = useFieldArray<ExtSwimmer>( "swimmers" )

  const clubOptions = computed( () => props.clubs.map( c => ( { label: c.clubName, value: c.clubId } ) ) )

  const userClubId = ref<string | undefined>( undefined )
  const userClubName = ref<string | undefined>( undefined )
  const userClubOwner = ref<0 | 1>( 0 )

  watch( () => props.clubs, () => {
    const firstClub = props.clubs.at( 0 )
    if ( firstClub ) {
      userClubId.value = firstClub.clubId
      userClubName.value = firstClub.clubName
      userClubOwner.value = firstClub.clubOwner ? 1 : 0
    }
  }, { immediate: true, deep: true } )

  watch( sendSetupEmail, ( setup ) => {
    if ( setup ) {
      setFieldValue( "password", "" )
      setFieldValue( "confirmPassword", "" )
    }
  } )

  const countyAdmin = ref<0 | 1>( 0 )
  const regionalAdmin = ref<0 | 1>( 0 )

  watch( () => props.user.attributes, ( attributes ) => {
    countyAdmin.value = attributes?.includes( "countyAdmin" ) ? 1 : 0
    regionalAdmin.value = attributes?.includes( "regionalAdmin" ) ? 1 : 0
  }, { immediate: true } )

  watch( [ countyAdmin, regionalAdmin ], ( [ county, regional ] ) => {
    const attributes: UserAttribute[] = []
    if ( county ) attributes.push( "countyAdmin" )
    if ( regional ) attributes.push( "regionalAdmin" )
    setFieldValue( "attributes", attributes )
  } )

  watch( [ userClubId, userClubOwner ], ( [ clubId, clubOwner ] ) => {
    if ( clubId ) {
      replaceUserClub( [ {
        clubId: String( clubId ),
        clubOwner,
      } ] )
    } else {
      userClubOwner.value = 0
      replaceUserClub( [] )
    }
    setTouched( true )
  } )

  const searchClubs = async ( query: string ) => {
    if ( !query ) return []
    const res = await $fetch( `/api/clubs/search?search=${encodeURIComponent( query )}` )
    const foundClubs = res.map( ( u: Club ) => ( {
      label: u.clubName,
      value: u.clubId,
    } ) )
    return foundClubs
  }

  const locationOptions = ref<UISelection[]>( props.user.locationId ? [ {
    label: props.user.location,
    value: props.user.locationId,
  } ] : [] )

  const onCaptchaSolved = ( token: string ) => {
    resetForm( {
      values: {
        ...values,
        captcha: token
      },
    } )
  }

  const turnstile = ref()
  const saveSuccess = ref( false )
  const userCreatedSuccess = ref( false )
  const saveError = ref( false )
  const saveErrorText = ref( "" )
  const save = handleSubmit( async () => {
    const wasNewUser = isNewUser.value
    try {
      submitErrors.length = 0
      await props.saveFn( values )
      resetForm( { values } )
      if ( wasNewUser ) userCreatedSuccess.value = true
      else saveSuccess.value = true
    } catch ( error ) {
      console.error( "Error", error )
      const message = ( error as FetchError ).message ?? "Unable to save changes."
      submitErrors[0] = message
      saveErrorText.value = message
      saveError.value = true
      turnstile.value?.reset()
    }
  } )

  useUnsavedWarning( () => meta.value.dirty )

  watch( errors, ( newErrors ) => {
    console.log( "ERR", newErrors )
  } )

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
        const club: Club | undefined = await $fetch<Club>( `/api/clubs/${selectedSwimmer.value.value.clubId}` )
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

  // Multi-select of swimmers for bulk deletion, keyed by field array key (new swimmers may not have an id yet)
  const selectedKeys = ref<Set<string | number>>( new Set() )
  const bulkDeleting = ref( false )

  const selectedCount = computed( () => selectedKeys.value.size )
  const allSelected = computed( () => userSwimmers.value.length > 0 && selectedCount.value === userSwimmers.value.length )
  const someSelected = computed( () => selectedCount.value > 0 && !allSelected.value )

  const toggleSelected = ( key: string | number ) => {
    const keys = new Set( selectedKeys.value )
    if ( keys.has( key ) ) keys.delete( key )
    else keys.add( key )
    selectedKeys.value = keys
  }

  const toggleAllSelected = () => {
    selectedKeys.value = allSelected.value ? new Set() : new Set( userSwimmers.value.map( s => s.key ) )
  }

  // Drop selections for swimmers no longer in the list (e.g. after a reset or save)
  watch( () => userSwimmers.value.map( s => s.key ), ( keys ) => {
    const current = new Set( keys )
    const pruned = [ ...selectedKeys.value ].filter( k => current.has( k ) )
    if ( pruned.length !== selectedKeys.value.size )
      selectedKeys.value = new Set( pruned )
  } )

  const deleteSelectedSwimmers = () => {
    // Remove from the highest index down so earlier indexes stay valid
    const indexes = userSwimmers.value
      .map( ( s, index ) => ( selectedKeys.value.has( s.key ) ? index : -1 ) )
      .filter( index => index >= 0 )
      .sort( ( a, b ) => b - a )
    indexes.forEach( index => removeSwimmer( index ) )
    selectedKeys.value = new Set()
    bulkDeleting.value = false
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

  const genders = [
    {
      label: "Open/Male",
      value: "male"
    },
    {
      label: "Female",
      value: "female"
    }
  ]
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
  const addSwimmersQueued = ref( false )
  const addSwimmersError = ref( false )
  const addSwimmersErrorText = ref( "" )
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
        // showAlert( "Swimmers are being added to account, please check back shortly", "info" )
        await createNotification( {
          notificationType: "info",
          notificationText: "Swimmers are being added to account, please check back shortly",
        } )
        addSwimmersQueued.value = true
      } catch ( error ) {
        console.error( "Error", error )
        addSwimmersErrorText.value = `Unable to add swimmers to account '${( error as FetchError ).message}'`
        addSwimmersError.value = true
        // showAlert( `Unable to add swimmers to account '${( error as FetchError ).message}'`, "error" )
        await createNotification( {
          notificationType: "error",
          notificationText: `Unable to add swimmers to account '${( error as FetchError ).message}'`
        } )
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

  watch( () => meta.value, ( newMeta ) => {
    console.log( "NM", newMeta, values )
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
          <p v-if="isRegistering" class="mt-1 text-sm/6 text-gray-600">
            Complete your personal details below and click on 'Register'. You will be able to add swimmers to your account once you are registered and logged in.
          </p>
          <p v-else class="mt-1 text-sm/6 text-gray-600">
            {{ isNewUser ? "Complete" : "Update "}} {{ editingSelf ? "your personal" : "user" }} details and the swimmers {{ editingSelf ? "you wish" : "for the user" }} to follow.
          </p>

          <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div class="sm:col-span-2">
              <UI-Input
                id="first-name"
                v-model="firstName"
                label="First Name"
                v-bind="firstNameAttrs"
                type="text"
                autocomplete="given-name"
                required
                :error="errors.firstName"
              />
            </div>

            <div class="sm:col-span-2">
              <UI-Input
                id="last-name"
                v-model="lastName"
                label="Last Name"
                v-bind="lastNameAttrs"
                type="text"
                autocomplete="family-name"
                required
                :error="errors.lastName"
              />
            </div>

            <div class="sm:col-span-2">
              <UI-Input
                id="phone"
                v-model="phone"
                label="Phone / Mobile"
                v-bind="phoneAttrs"
                type="text"
                autocomplete="tel"
                :error="errors.phone"
              />
            </div>

            <div class="sm:col-span-2 sm:col-start-1">
              <UI-Input
                id="email"
                v-model="username"
                label="Email address"
                v-bind="usernameAttrs"
                type="text"
                autocomplete="email"
                required
                :error="errors.username"
              />
            </div>

            <div
              v-if="!hidePasswordFields"
              class="sm:col-span-2"
            >
              <UI-Input
                id="password"
                v-model="password"
                label="Password"
                v-bind="passwordAttrs"
                type="password"
                required
                :error="errors.password"
              />
            </div>

            <div
              v-if="!hidePasswordFields"
              class="sm:col-span-2"
            >
              <UI-Input
                id="confirm-password"
                v-model="confirmPassword"
                label="Confirm Password"
                v-bind="confirmPasswordAttrs"
                type="password"
                required
                :error="errors.confirmPassword"
              />
            </div>

            <div
              v-if="showSetupEmailToggle"
              class="sm:col-span-2"
            >
              <UI-input
                v-model="sendSetupEmail"
                type="checkbox"
                label="Email the user a link to set up their own password"
                :true-value="1"
                :false-value="0"
              />
            </div>

            <div class="sm:col-span-2 sm:col-start-1">
              <UI-Combobox
                id="location-id"
                v-model="locationId"
                label="Town / City (for distance calculations)"
                v-bind="locationIdAttrs"
                autocomplete="address-level2"
                placeholder="Enter your town or city"
                required
                :options="locationOptions"
                :fetch-options="searchLocation"
                :error="errors.locationId"
                @update:model-value="( id ) => {
                  if ( id ) {
                    const option = locations.find( v => v.place_id === Number( id ) )
                    if ( option )
                      setFieldValue( 'location', option.display_name )
                  }
                }"

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
                :options="clubOptions"
                :fetch-options="searchClubs"
              />
            </div>
            <div
              v-if="isAdmin || showAdminAttributes"
              class="sm:col-span-2 flex gap-x-6"
            >
              <div v-if="isAdmin">
                <UI-input
                  v-model="userClubOwner"
                  type="checkbox"
                  label="Club Admin"
                  :disabled="!userClubId"
                  :true-value="1"
                  :false-value="0"
                />
              </div>
              <div v-if="showAdminAttributes">
                <UI-input
                  v-model="countyAdmin"
                  type="checkbox"
                  label="County Admin"
                  :true-value="1"
                  :false-value="0"
                />
              </div>
              <div v-if="showAdminAttributes">
                <UI-input
                  v-model="regionalAdmin"
                  type="checkbox"
                  label="Regional Admin"
                  :true-value="1"
                  :false-value="0"
                />
              </div>
            </div>
            <div
              v-if="isNewUser && !isAdmin"
              class="sm:col-span-1"
            >
              <ClientOnly>
                <NuxtTurnstile ref="turnstile" v-model="captcha" :site-key="config.public.turnstileSiteKey as string" @update:model-value="onCaptchaSolved" />
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isNewUser" class="border-b border-gray-900/10 pt-8 pb-12">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="sm:flex sm:items-center">
          <div class="sm:flex-auto">
            <h1 class="text-base font-semibold text-gray-900">
              Swimmers
            </h1>
            <p class="mt-2 text-sm text-gray-700">
              A list of the swimmers to track on {{ editingSelf ? "your" : "the user's" }} account.
            </p>
            <p class="mt-2 text-sm text-gray-700">
              Please ensure all birthdays are filled in order that the appropriate qualifying and competition times are used.
              Note that swimmer details are queued to be fetched when first added to your account but it may take a short while before their data is fully populated.
              You can monitor progess on the <nuxt-link href="/updates" class="underline">updates</nuxt-link> and <nuxt-link href="/tasks" class="underline">tasks</nuxt-link> pages.
            </p>
          </div>
          <div class="mt-4 sm:mt-0 sm:ml-8 sm:flex-none">
            <button
              type="button"
              :disabled="!selectedCount || editing !== null"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-red-600 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              @click="bulkDeleting = true"
            >
              <TrashIcon
                class="-ml-0.5 size-5"
                aria-hidden="true"
              />
              Delete selected{{ selectedCount ? ` (${selectedCount})` : "" }}
            </button>
          </div>
          <div
            v-if="userClubId && userClubOwner"
            class="mt-4 sm:mt-0 sm:ml-8 sm:flex-none"
          >
            <button
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
                      class="py-3.5 pr-1 pl-2 text-left sm:pl-0"
                    >
                      <input
                        type="checkbox"
                        class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        :checked="allSelected"
                        :indeterminate="someSelected"
                        :disabled="!userSwimmers.length"
                        aria-label="Select all swimmers"
                        @change="toggleAllSelected"
                      >
                    </th>
                    <th
                      scope="col"
                      class="px-1 py-3.5 text-left text-sm font-semibold text-gray-900"
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
                    <td class="py-1 pr-1 pl-2 sm:pl-0">
                      <input
                        type="checkbox"
                        class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        :checked="selectedKeys.has( swimmer.key )"
                        :aria-label="`Select ${swimmer.value.fullName ?? swimmer.value.id}`"
                        @change="toggleSelected( swimmer.key )"
                      >
                    </td>
                    <td class="px-1 py-1 text-sm font-medium whitespace-nowrap text-gray-900">
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
        @click="() => { resetForm(); editing = null; deleting = null; bulkDeleting = false; selectedKeys = new Set(); submitErrors.length = 0 }"
      >
        Reset
      </button>
      <button
        type="submit"
        :disabled="editing !== null || deleting !== null || bulkDeleting || !meta.dirty || !isFormValid"
        class="rounded-md bg-indigo-600 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        {{ isNewUser ? "Register" : "Save" }}
      </button>
    </div>

    <div class="hidden sm:flex sticky bottom-0 bg-white border-t p-4 justify-end gap-x-6">
      <button
        type="button"
        class="text-sm/6 font-semibold text-gray-900 disabled:text-gray-300"
        :disabled="!meta.dirty"
        @click="() => { resetForm(); editing = null; deleting = null; bulkDeleting = false; selectedKeys = new Set(); submitErrors.length = 0 }"
      >
        Reset
      </button>
      <button
        type="submit"
        :disabled="editing !== null || deleting !== null || bulkDeleting || !meta.dirty || !isFormValid"
        class="rounded-md bg-indigo-600 disabled:bg-gray-300 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        {{ isNewUser ? "Register" : "Save" }}
      </button>
    </div>
  </form>

  <UI-Confirm
    v-if="deleting !== null"
    title="Delete swimmer"
    :text="`Are you sure you want to delete swimmer '${userSwimmers[deleting!]!.value.fullName}' from your account? The deletion won't take effect until you click Save.`"
    confirm-label="Delete"
    :action="deleteSwimmer"
    :cancel-action="() => { deleting = null }"
  />

  <UI-Confirm
    v-if="bulkDeleting"
    title="Delete swimmers"
    :text="`Are you sure you want to delete ${selectedCount} selected swimmer${selectedCount === 1 ? '' : 's'} from ${editingSelf ? 'your' : 'the user\'s'} account? The deletion won't take effect until you click Save.`"
    confirm-label="Delete"
    :action="deleteSelectedSwimmers"
    :cancel-action="() => { bulkDeleting = false }"
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
              :disabled="!userClubOwner"
              label="Squad"
              :strict="false"
              :options="squads"
            />
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
  <UI-SuccessNotification
    v-model="userCreatedSuccess"
    title="User created!"
    text="The new user has been added."
  />
  <UI-ErrorNotification
    v-model="saveError"
    title="Unable to save"
    :text="saveErrorText"
  />
  <UI-SuccessNotification
    v-model="addSwimmersQueued"
    title="Swimmers queued!"
    text="Club swimmers are being added in the background. Check the Updates or Tasks pages for progress."
  />
  <UI-ErrorNotification
    v-model="addSwimmersError"
    title="Unable to queue swimmers"
    :text="addSwimmersErrorText"
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
