import { FetchError } from "ofetch"
import { format } from "date-fns"
import type { Swimmer } from "lib"

export const useSwimmer = () => {
  const swimmerId = useState<Swimmer["id"] | undefined>(
    "swimmerId",
    () => undefined
  )

  usePersisted<Swimmer["id"] | undefined>( "swimmerId", swimmerId )

  const { swimmers } = useSwimmers()
  const updated = useLastUpdate()
  const requestFetch = useRequestFetch()

  /**
   * Ensure persisted swimmerId is valid whenever swimmers change.
   * This mutates persisted state ONLY if missing/invalid.
   */
  const ensureValidSwimmerId = () => {
    const list = swimmers.value
    if ( !list.length ) return

    const id = swimmerId.value

    if ( !id || !list.some( s => s.id === id ) ) {
      swimmerId.value = list[0]!.id
    }
  }

  watch(
    swimmers,
    () => {
      ensureValidSwimmerId()
    },
    { immediate: true, flush: "post" }
  )

  if ( import.meta.client ) {
    onMounted( () => {
      ensureValidSwimmerId()
    } )
  }

  /**
   * Canonical swimmer from persisted id
   */
  const swimmer = computed<Swimmer | undefined>( () => {
    if ( !swimmers.value.length ) return undefined
    if ( !swimmerId.value ) return undefined
    return swimmers.value.find( s => s.id === swimmerId.value )
  } )

  /**
   * v-model for selector
   *
   * CRITICAL DETAIL:
   * - Getter NEVER returns undefined once swimmers exist
   * - Falls back to first swimmer for display only
   * - Setter is the ONLY place that mutates swimmerId from UI
   */
  const swimmerModel = computed<Swimmer | undefined>( {
    get: () => {
      const list = swimmers.value
      if ( !list.length ) return undefined
      return swimmer.value ?? list[0]
    },
    set: ( newSwimmer ) => {
      swimmerId.value = newSwimmer?.id
    },
  } )

  /**
   * Fetch last update whenever swimmerId changes
   */
  watch(
    swimmerId,
    async ( id ) => {
      if ( !id ) {
        updated.value = "<unknown>"
        return
      }

      try {
        const lastUpdate = await requestFetch( `/api/updated/${id}` )
        updated.value = format( lastUpdate, "yyyy-MM-dd" )
      } catch ( error ) {
        if ( error instanceof FetchError && error.status === 404 ) {
          updated.value = "<never>"
        } else {
          updated.value = "<error>"
        }
      }
    },
    { immediate: true, flush: "post" }
  )

  return { swimmer: swimmerModel, updated }
}
