<script setup lang="ts">
  const model = defineModel<string>( { default: "" } )

  const props = withDefaults( defineProps<{
    label?: string
    disabled?: boolean
    title?: string
  }>(), {
    label: "Official time",
    disabled: false,
    title: undefined,
  } )

  const minutes = ref( "" )
  const seconds = ref( "" )
  const hundredths = ref( "" )
  const syncingFromModel = ref( false )

  const onlyDigits = ( value: string, maxLength: number ) =>
    String( value ?? "" ).replace( /\D/g, "" ).slice( 0, maxLength )

  const boundedDigits = ( value: string, max: number ) => {
    const digits = onlyDigits( value, 2 )
    if ( !digits ) return ""
    return Number( digits ) > max ? String( max ) : digits
  }

  const splitSecondsAndHundredths = ( value: string, maxSecondsDigits = 2 ) => {
    const [ sec = "", fraction = "" ] = value.replace( ",", "." ).split( "." )
    return {
      seconds: maxSecondsDigits === 2 ? boundedDigits( sec, 59 ) : onlyDigits( sec, maxSecondsDigits ),
      hundredths: boundedDigits( fraction, 99 ),
    }
  }

  const syncPartsFromModel = ( value: string ) => {
    syncingFromModel.value = true

    const raw = String( value ?? "" ).trim()
    if ( !raw ) {
      minutes.value = ""
      seconds.value = ""
      hundredths.value = ""
      syncingFromModel.value = false
      return
    }

    const parts = raw.split( ":" )
    const time = splitSecondsAndHundredths( parts.at( -1 ) ?? "", parts.length > 1 ? 2 : 5 )

    if ( parts.length > 1 ) {
      minutes.value = boundedDigits( parts.slice( 0, -1 ).join( "" ), 59 )
      seconds.value = time.seconds
    } else {
      const totalSeconds = Number( time.seconds || 0 )
      if ( totalSeconds >= 60 ) {
        minutes.value = boundedDigits( String( Math.floor( totalSeconds / 60 ) ), 59 )
        seconds.value = String( totalSeconds % 60 ).padStart( 2, "0" )
      } else {
        minutes.value = ""
        seconds.value = time.seconds
      }
    }

    hundredths.value = time.hundredths

    syncingFromModel.value = false
  }

  const buildModelValue = () => {
    const m = boundedDigits( minutes.value, 59 )
    const s = boundedDigits( seconds.value, 59 )
    const h = boundedDigits( hundredths.value, 99 )

    if ( !m && !s && !h ) return ""

    const sec = s || "0"
    const cents = ( h || "0" ).padEnd( 2, "0" )

    if ( m ) return `${Number( m )}:${sec.padStart( 2, "0" )}.${cents}`
    return `${Number( sec )}.${cents}`
  }

  watch(
    model,
    value => {
      if ( syncingFromModel.value ) return
      if ( value === buildModelValue() ) return
      syncPartsFromModel( value )
    },
    { immediate: true }
  )

  watch( [ minutes, seconds, hundredths ], () => {
    if ( syncingFromModel.value ) return
    model.value = buildModelValue()
  } )

  const readBoundedInput = ( event: Event, max: number ) => {
    const input = event.target as HTMLInputElement
    const value = boundedDigits( input.value, max )
    if ( input.value !== value ) input.value = value
    return value
  }

  const onMinutesInput = ( event: Event ) => {
    minutes.value = readBoundedInput( event, 59 )
  }

  const onSecondsInput = ( event: Event ) => {
    seconds.value = readBoundedInput( event, 59 )
  }

  const onHundredthsInput = ( event: Event ) => {
    hundredths.value = readBoundedInput( event, 99 )
  }

  const displayLabel = computed( () =>
    minutes.value || seconds.value || hundredths.value
      ? props.label
      : `${props.label}: mm:ss:sss`
  )
</script>

<template>
  <div>
    <label class="block text-xs font-medium text-gray-700 mb-1">{{ displayLabel }}</label>

    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
      <input
        :value="minutes"
        :disabled="props.disabled"
        :title="props.title"
        type="text"
        inputmode="numeric"
        maxlength="2"
        autocomplete="off"
        aria-label="Minutes"
        placeholder="mm"
        class="h-10 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-center text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
        @input="onMinutesInput"
      >

      <span class="text-sm font-semibold text-gray-500">:</span>

      <input
        :value="seconds"
        :disabled="props.disabled"
        :title="props.title"
        type="text"
        inputmode="numeric"
        maxlength="2"
        autocomplete="off"
        aria-label="Seconds"
        placeholder="ss"
        class="h-10 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-center text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
        @input="onSecondsInput"
      >

      <span class="text-sm font-semibold text-gray-500">.</span>

      <input
        :value="hundredths"
        :disabled="props.disabled"
        :title="props.title"
        type="text"
        inputmode="numeric"
        maxlength="2"
        autocomplete="off"
        aria-label="Hundredths"
        placeholder="sss"
        class="h-10 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-center text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
        @input="onHundredthsInput"
      >
    </div>
  </div>
</template>
