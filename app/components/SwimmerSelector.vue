<script setup lang="ts">
  import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
  import { format } from "date-fns"
  import type { Swimmer } from "lib"
  import { FetchError } from "ofetch"

  const props = withDefaults( defineProps<{
    showUpdated?: boolean
  }>(), {
    showUpdated: false,
  } )


  const { swimmers } = await useSwimmers()

  const swimmerId = ref< string | null >( ( swimmers.value && swimmers.value.length && swimmers.value[0].id ) || null )
  const lookupSwimmer = ( id: string | null ) => ( ( swimmers.value || [] ).find( s => s.id === id ) ?? null )
  const swimmer = useState<Swimmer | null>( "swimmer", () => lookupSwimmer( swimmerId.value ) )

  const updated = useLastUpdate()

  watch(
    swimmerId,
    async ( newSwimmerId ) => {
      if ( newSwimmerId ) {
        swimmer.value = lookupSwimmer( newSwimmerId )
        try {
          const lastUpdate = await $fetch( `/api/updated/${newSwimmerId}` )
          updated.value = format( lastUpdate, "yyyy-MM-dd" )
        } catch ( error ) {
          updated.value = "<error>"
          if ( error instanceof FetchError ) {
            const apiError = error as FetchError
            if ( apiError.status === 404 ) {
              updated.value = "<never>"
            }
          }
        }
      }
    },
    { immediate: true }
  )
</script>

<template>
  <div>
    <div class="min-w-64">
      <Listbox
        v-if="swimmers && swimmers.length"
        v-model="swimmerId"
        as="div"
      >
        <div class="relative">
          <ListboxButton class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
            <span class="block truncate">{{ swimmer?.fullName }}</span>
            <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                class="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </ListboxButton>
          <transition
            leave-active-class="transition ease-in duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              <ListboxOption
                v-for="option in swimmers"
                :key="option.id"
                v-slot="{ active, selected }"
                as="template"
                :value="option.id"
              >
                <li :class="[active ? 'bg-indigo-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-1 pl-3 pr-9']">
                  <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ option.fullName }}</span>
                  <span
                    v-if="selected"
                    :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"
                  >
                    <CheckIcon
                      class="h-5 w-5"
                      aria-hidden="true"
                    />
                  </span>
                </li>
              </ListboxOption>
            </ListboxOptions>
          </transition>
        </div>
      </Listbox>
      <span
        v-else
        class="text-red-500"
      >No Swimmers On Account</span>
    </div>
    <p
      v-if="props.showUpdated"
      class="pl-2 mr-2 text-sm text-gray-700"
    >
      <ClientOnly>Updated: {{ updated }}</ClientOnly>
    </p>
  </div>
</template>
