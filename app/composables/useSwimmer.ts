import { FetchError } from "ofetch"
import { format } from "date-fns"
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

  const updated = useLastUpdate()

  watch( swimmerId, async ( id ) => {
    if ( id ) {
      try {
        const lastUpdate = await $fetch( `/api/updated/${id}` )
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
    } else {
      updated.value = "<unknown>"
    }
  }, { immediate: true } )

  // Optional: keep swimmerId in sync (e.g., if swimmers list changes and selected swimmer disappears)
  watch( swimmer, async ( s ) => {
    if ( s?.id !== swimmerId.value ) {
      swimmerId.value = s?.id
    }
  } )

  return { swimmer, updated }
}
