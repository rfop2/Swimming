import { FetchError } from "ofetch"
import { format } from "date-fns"
import type { Swimmer } from "lib"

export const useSwimmer = () => {
  const { state: swimmerId } = usePersisted<Swimmer["id"] | undefined>( "swimmerId", undefined )

  const { swimmers } = useSwimmers()
  const updated = useLastUpdate()

  // Display swimmer: do NOT implicitly change swimmerId here.
  const swimmer = computed<Swimmer | undefined>( () => {
    if ( !swimmers.value.length ) return undefined
    if ( !swimmerId.value ) return swimmers.value[0]
    return swimmers.value.find( s => s.id === swimmerId.value ) ?? // no fallback here
      swimmers.value[0] // purely for display, not persisted
  } )

  // v-model target: explicit setter writes swimmerId
  const swimmerModel = computed<Swimmer | undefined>( {
    get: () => swimmer.value,
    set: ( newSwimmer ) => {
      swimmerId.value = newSwimmer?.id
    },
  } )

  // Only “repair” persisted state once swimmers are available
  watch(
    [ swimmers, swimmerId ],
    ( [ list, id ] ) => {
      if ( !list.length ) return

      // If no persisted id, initialise once
      if ( !id ) {
        swimmerId.value = list[0]!.id
        return
      }

      // If persisted id is not in the list (e.g. deleted), repair
      const exists = list.some( s => s.id === id )
      if ( !exists ) swimmerId.value = list[0]!.id
    },
    { immediate: true }
  )

  watch(
    swimmerId,
    async ( id ) => {
      if ( !id ) {
        updated.value = "<unknown>"
        return
      }

      try {
        const lastUpdate = await $fetch( `/api/updated/${id}` )
        updated.value = format( lastUpdate, "yyyy-MM-dd" )
      } catch ( error ) {
        updated.value = "<error>"
        if ( error instanceof FetchError && error.status === 404 ) {
          updated.value = "<never>"
        }
      }
    },
    { immediate: true }
  )

  return { swimmer: swimmerModel, updated }
}
