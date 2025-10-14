import type { Swimmer } from "lib"

export const useSwimmer = () => {
  const { state: swimmerId, ready } = usePersisted<Swimmer["id"] | undefined>( "swimmerId", undefined )
  const { swimmers } = useSwimmers()

  // Computed swimmer based on swimmerId
  const swimmer = computed<Swimmer | undefined>( {
    get() {
      if ( !ready.value || !swimmers.value.length ) return undefined
      return swimmers.value.find( s => s.id === swimmerId.value ) ?? swimmers.value[0]
    },
    set( newSwimmer ) {
      swimmerId.value = newSwimmer?.id
    },
  } )

  watchEffect( () => {
    console.log( "si", swimmerId.value )
  } )

  // Optional: keep swimmerId in sync (e.g., if swimmers list changes and selected swimmer disappears)
  watch( swimmer, s => {
    console.log( "SW", swimmer.value )
    if ( s?.id !== swimmerId.value ) {
      swimmerId.value = s?.id
    }
  } )

  return { swimmer }
}
