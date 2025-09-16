import type { Swimmer } from "lib"

export const useSwimmer = () => {
  const { state: swimmerId, ready } = usePersisted<Swimmer["id"] | undefined>( "swimmerId", undefined )
  const { swimmers } = useSwimmers()

  // Computed swimmer based on swimmerId
  const swimmer = computed<Swimmer | undefined>( () => {
    if ( !ready.value || !swimmers.value.length ) return undefined
    return swimmers.value.find( s => s.id === swimmerId.value ) ?? swimmers.value[0]
  } )

  // Optional: keep swimmerId in sync (e.g., if swimmers list changes and selected swimmer disappears)
  watch( swimmer, s => {
    if ( s?.id !== swimmerId.value ) {
      swimmerId.value = s?.id
    }
  } )

  // Helper to update the current swimmer
  const setSwimmer = ( newSwimmer?: Swimmer ) => {
    swimmerId.value = newSwimmer?.id
  }

  return { swimmer, setSwimmer }
}
