<script setup lang="ts">
  const model = defineModel<string>( { default: "" } )

  const props = withDefaults( defineProps<{
    label?: string
    disabled?: boolean
  }>(), {
    label: "Official time",
    disabled: false,
  } )

  const minutes = ref( "" )
  const seconds = ref( "" )
  const hundredths = ref( "" )
  const syncingFromModel = ref( false )

  const onlyDigits = ( value: string, maxLength: number ) =>
    String( value ?? "" ).replace( /\D/g, "" ).slice( 0, maxLength )

  const splitSecondsAndHundredths = ( value: string, maxSecondsDigits = 2 ) => {
    const [ sec = "", fraction = "" ] = value.replace( ",", "." ).split( "." )
    return {
      seconds: onlyDigits( sec, maxSecondsDigits ),
      hundredths: onlyDigits( fraction, 2 ),
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
      minutes.value = onlyDigits( parts.slice( 0, -1 ).join( "" ), 3 )
      seconds.value = time.seconds
    } else {
      const totalSeconds = Number( time.seconds || 0 )
      if ( totalSeconds >= 60 ) {
        minutes.value = String( Math.floor( totalSeconds / 60 ) )
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
    const m = onlyDigits( minutes.value, 3 )
    const s = onlyDigits( seconds.value, 2 )
    const h = onlyDigits( hundredths.value, 2 )

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
      syncPartsFromModel( value )
    },
    { immediate: true }
  )

  watch( [ minutes, seconds, hundredths ], () => {
    if ( syncingFromModel.value ) return
    model.value = buildModelValue()
  } )

  const onMinutesInput = ( event: Event ) => {
    minutes.value = onlyDigits( ( event.target as HTMLInputElement ).value, 3 )
  }

  const onSecondsInput = ( event: Event ) => {
    seconds.value = onlyDigits( ( event.target as HTMLInputElement ).value, 2 )
  }

  const onHundredthsInput = ( event: Event ) => {
    hundredths.value = onlyDigits( ( event.target as HTMLInputElement ).value, 2 )
  }
</script>

<template>
  <div>
    <label class="block text-xs font-medium text-gray-700 mb-1">{{ props.label }}</label>

    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
      <input
        :value="minutes"
        :disabled="props.disabled"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="min"
        class="h-10 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-center text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
        @input="onMinutesInput"
      >

      <span class="text-sm font-semibold text-gray-500">:</span>

      <input
        :value="seconds"
        :disabled="props.disabled"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="sec"
        class="h-10 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-center text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
        @input="onSecondsInput"
      >

      <span class="text-sm font-semibold text-gray-500">.</span>

      <input
        :value="hundredths"
        :disabled="props.disabled"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="cs"
        class="h-10 min-w-0 rounded-md border border-gray-300 bg-white px-2 text-center text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
        @input="onHundredthsInput"
      >
    </div>
  </div>
</template>
