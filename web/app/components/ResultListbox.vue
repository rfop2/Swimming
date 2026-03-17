<script setup lang="ts">
  import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
  import classNames from "classnames"

  type ResultRow = {
    swimmer: string
    course: string
    stroke: string
    distance: string
    seq: number
    date: string
    meet: string
    round: string
  }

  type Option = {
    value: string | null
    label: string
    result?: ResultRow
  }

  const model = defineModel<string | null>()

  const defaultId = useId()

  const props = withDefaults(
    defineProps<{
      id?: string
      swimmerId?: string | null
      course?: string | null
      stroke?: string | null
      distance?: string | null
      label?: string
      required?: boolean
      placeholder?: string
      error?: string
      searchPlaceholder?: string
      panelClass?: string
      debounceMs?: number
    }>(),
    {
      id: undefined,
      swimmerId: null,
      course: null,
      stroke: null,
      distance: null,
      label: undefined,
      required: false,
      placeholder: "Choose result (optional)",
      error: "",
      searchPlaceholder: "Search result...",
      panelClass: "max-h-[60vh]",
      debounceMs: 250,
    }
  )

  const query = ref( "" )
  const debounced = ref( "" )
  let t: ReturnType<typeof setTimeout> | null = null

  watch( query, ( v ) => {
    if ( t ) clearTimeout( t )
    t = setTimeout( () => {
      debounced.value = v
    }, props.debounceMs )
  } )

  onBeforeUnmount( () => {
    if ( t ) clearTimeout( t )
  } )

  watch(
    () => [ props.swimmerId, props.course, props.stroke, props.distance ],
    () => {
      model.value = null
      query.value = ""
      debounced.value = ""
    }
  )

  const enabled = computed( () =>
    !!props.swimmerId &&
    !!props.course &&
    !!props.stroke &&
    !!props.distance
  )

  const { data: results, pending } = useAsyncData(
    () => `result-listbox-${props.swimmerId ?? ""}-${props.course ?? ""}-${props.stroke ?? ""}-${props.distance ?? ""}-${debounced.value}`,
    () => {
      if ( !enabled.value ) return Promise.resolve( [] )

      return $fetch<ResultRow[]>( "/api/competition/results-video-timer-sessions", {
        query: {
          swimmerId: props.swimmerId ?? undefined,
          course: props.course ?? undefined,
          stroke: props.stroke ?? undefined,
          distance: props.distance ?? undefined,
          q: debounced.value.trim() ? debounced.value.trim() : undefined,
        },
      } )
    },
    { default: () => [] }
  )

  const normalizeText = ( value: string ) =>
    String( value ?? "" )
      .toLowerCase()
      .normalize( "NFD" )
      .replace( /[\u0300-\u036f]/g, "" )
      .replace( /[•·]/g, " " )
      .replace( /\s+/g, " " )
      .trim()

  const queryTokens = computed( () =>
    normalizeText( query.value )
      .split( " " )
      .filter( Boolean )
  )

  const matchesResultQuery = ( r: ResultRow ) => {
    if ( queryTokens.value.length === 0 ) return true

    const haystack = normalizeText(
      `${r.date} ${r.meet} ${r.round} ${r.seq}`
    )

    return queryTokens.value.every( token => haystack.includes( token ) )
  }

  const formatDisplayDate = ( value?: string | null ) => {
    const s = String( value ?? "" ).trim()
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec( s )
    if ( !m ) return s
    return `${m[3]}/${m[2]}/${m[1]}`
  }

  const visibleResults = computed( () => {
    return ( results.value ?? [] ).filter( matchesResultQuery )
  } )

  const serializeResultValue = ( result: ResultRow ) =>
    JSON.stringify( {
      swimmer: result.swimmer,
      course: result.course,
      stroke: result.stroke,
      distance: result.distance,
      seq: result.seq,
      date: result.date,
      meet: result.meet,
    } )

  const options = computed<Option[]>( () => [
    { value: null, label: "No linked result" },
    ...visibleResults.value.map( ( result ) => ( {
      value: serializeResultValue( result ),
      label: `${formatDisplayDate( result.date )} • ${result.meet}`,
      result,
    } ) ),
  ] )

  const empty = computed( () => model.value === null || model.value === undefined )

  const prompt = computed( () => {
    if ( empty.value ) return props.placeholder
    return options.value.find( ( o ) => o.value === model.value )?.label ?? String( model.value )
  } )
</script>

<template>
  <Listbox :id="props.id ?? defaultId" v-model="model" as="div" :required="props.required">
    <ListboxLabel v-if="props.label" class="block text-sm font-medium leading-6 text-gray-900">
      {{ props.label }}
    </ListboxLabel>

    <div :class="classNames('relative', { 'mt-1 sm:mt-2': props.label })">
      <ListboxButton
        class="form-disabled relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
      >
        <span class="block truncate">{{ prompt }}</span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon class="form-disabled h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </ListboxButton>

      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <ListboxOptions
          class="absolute z-10 mt-1 w-full overflow-hidden rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
        >
          <div class="p-2 border-b border-gray-200">
            <input
              v-model="query"
              class="w-full h-9 px-3 rounded-md border border-gray-300 text-sm"
              :placeholder="props.searchPlaceholder"
              @keydown.space.stop
              @keydown.enter.stop
            >
          </div>

          <div class="overflow-auto" :class="props.panelClass">
            <div v-if="pending" class="px-3 py-2 text-xs text-gray-500">Loading…</div>

            <div v-else-if="!enabled" class="px-3 py-2 text-xs text-gray-500">
              Select swimmer, course, stroke and distance first.
            </div>

            <div v-else-if="options.length === 1" class="px-3 py-2 text-xs text-gray-500">
              No matches.
            </div>

            <ListboxOption
              v-for="option in options"
              :key="option.value ?? '__none__'"
              v-slot="{ active, selected }"
              as="template"
              :value="option.value"
            >
              <li
                :class="[
                  active ? 'bg-indigo-600 text-white' : 'text-gray-900',
                  'relative cursor-default select-none py-2 pl-3 pr-9'
                ]"
              >
                <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                  {{ option.label }}
                </span>

                <span
                  v-if="selected"
                  :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </div>
        </ListboxOptions>
      </transition>
    </div>

    <span v-if="props.error" class="text-sm text-red-600">{{ props.error }}</span>
  </Listbox>
</template>