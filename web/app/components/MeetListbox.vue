<script setup lang="ts">
  import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/vue"
  import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/24/outline"
  import classNames from "classnames"

  type MeetRow = {
    id: string
    name: string
    date: string
    course: string
    location: string | null
    code: string
  }

  type Option = { value: string | null; label: string }

  const model = defineModel<string | null>()

  const defaultId = useId()

  const props = withDefaults(
    defineProps<{
      id?: string
      course: string
      label?: string
      required?: boolean
      placeholder?: string
      error?: string
      searchPlaceholder?: string
      panelClass?: string
      debounceMs?: number
      hintName?: string | null
      hintDate?: string | null
    }>(),
    {
      id: undefined,
      label: undefined,
      required: false,
      placeholder: "Choose Meet (optional)",
      error: "",
      searchPlaceholder: "Search meet…",
      panelClass: "max-h-[60vh]",
      debounceMs: 250,
      hintName: null,
      hintDate: null,
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
    () => props.course,
    () => {
      model.value = null
      query.value = ""
      debounced.value = ""
    }
  )

  const { data: meets, pending } = useAsyncData(
    () => `meet-listbox-${props.course}-${debounced.value}`,
    () =>
      $fetch<MeetRow[]>( "/api/competition/meets-video-timer-sessions", {
        query: {
          course: props.course,
          q: debounced.value.trim() ? debounced.value.trim() : undefined,
        },
      } ),
    { default: () => [] }
  )

  const todayIsoLocal = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String( d.getMonth() + 1 ).padStart( 2, "0" )
    const day = String( d.getDate() ).padStart( 2, "0" )
    return `${y}-${m}-${day}`
  }

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

  const matchesMeetQuery = ( m: MeetRow ) => {
    if ( queryTokens.value.length === 0 ) return true

    const haystack = normalizeText(
      `${m.date} ${m.name} ${m.location ?? ""} ${m.code}`
    )

    return queryTokens.value.every( token => haystack.includes( token ) )
  }



  const parseIsoDateToDay = ( value?: string | null ) => {
    const s = String( value ?? "" ).trim()
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec( s )
    if ( !m ) return null
    const y = Number( m[1] )
    const mo = Number( m[2] )
    const d = Number( m[3] )
    return Math.floor( Date.UTC( y, mo - 1, d ) / 86400000 )
  }

  const tokenOverlapScore = ( candidate: string, hint: string ) => {
    const c = normalizeText( candidate )
    const h = normalizeText( hint )
    if ( !c || !h ) return 0

    const cTokens = new Set( c.split( " " ).filter( ( x ) => x.length >= 2 ) )
    const hTokens = new Set( h.split( " " ).filter( ( x ) => x.length >= 2 ) )

    if ( !cTokens.size || !hTokens.size ) return 0

    let common = 0
    for ( const token of hTokens ) {
      if ( cTokens.has( token ) ) common++
    }

    return Math.round( ( common / hTokens.size ) * 100 )
  }

  const calcNameScore = ( meetName: string, hintName?: string | null ) => {
    const hint = String( hintName ?? "" ).trim()
    if ( !hint ) return 0

    const a = normalizeText( meetName )
    const b = normalizeText( hint )
    if ( !a || !b ) return 0

    if ( a === b ) return 300
    if ( a.includes( b ) || b.includes( a ) ) return 220

    return tokenOverlapScore( a, b )
  }

  const calcDateScore = ( meetDate: string, hintDate?: string | null ) => {
    const a = parseIsoDateToDay( meetDate )
    const b = parseIsoDateToDay( hintDate )
    if ( a === null || b === null ) return 0

    const diff = Math.abs( a - b )

    if ( diff === 0 ) return 300
    if ( diff <= 1 ) return 220
    if ( diff <= 3 ) return 160
    if ( diff <= 7 ) return 100
    if ( diff <= 14 ) return 50
    return 0
  }

  const rankMeet = ( meet: MeetRow ) => {
    const nameScore = calcNameScore( meet.name, props.hintName )
    const dateScore = calcDateScore( meet.date, props.hintDate )

    const strongName = nameScore >= 220
    const sameDate = dateScore === 300
    const nearDate = dateScore > 0

    let boost = 0
    if ( sameDate && strongName ) boost += 500
    else if ( nearDate && strongName ) boost += 200

    const total = ( dateScore * 3 ) + ( nameScore * 2 ) + boost

    return { total, nameScore, dateScore }
  }

  const filteredNotFuture = computed( () => {
    const today = todayIsoLocal()
    return ( meets.value ?? [] ).filter( ( m ) => {
      const date = String( m.date ?? "" ).trim()
      if ( !date ) return true
      return date <= today
    } )
  } )

  const defaultSort = ( a: MeetRow, b: MeetRow ) => {
    const da = String( a.date ?? "" )
    const db = String( b.date ?? "" )
    if ( da !== db ) return db.localeCompare( da )
    return String( a.name ?? "" ).localeCompare( String( b.name ?? "" ) )
  }

  const sorted = computed( () => {
    const list = filteredNotFuture.value.slice()

    const hasHintName = !!String( props.hintName ?? "" ).trim()
    const hasHintDate = !!String( props.hintDate ?? "" ).trim()
    const userTypedSearch = !!debounced.value.trim()

    if ( !userTypedSearch && ( hasHintName || hasHintDate ) ) {
      list.sort( ( a, b ) => {
        const ra = rankMeet( a )
        const rb = rankMeet( b )

        if ( ra.total !== rb.total ) return rb.total - ra.total
        if ( ra.dateScore !== rb.dateScore ) return rb.dateScore - ra.dateScore
        if ( ra.nameScore !== rb.nameScore ) return rb.nameScore - ra.nameScore

        return defaultSort( a, b )
      } )
      return list
    }

    list.sort( defaultSort )
    return list
  } )

  const visibleMeets = computed( () => {
    return sorted.value.filter( matchesMeetQuery )
  } )

  const options = computed<Option[]>( () => {
    return [
      { value: null, label: "No meet (optional)" },
      ...visibleMeets.value.map( ( m ) => ( {
        value: String( m.id ),
        label: `${m.date} • ${m.name}`,
      } ) ),
    ]
  } )

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
