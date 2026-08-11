import { format } from "date-fns"
import { toValue, type MaybeRefOrGetter } from "vue"
import type { ExtSwimmer } from "lib"

export const useSwimmers = ( userId?: MaybeRefOrGetter<string | undefined> ) => {
  const swimmers = useState<ExtSwimmer[]>( `${toValue( userId ) ?? "0"}:swimmers`, () => [] )
  const requestFetch = useRequestFetch()

  const fetchSwimmers = async (): Promise<ExtSwimmer[]> => {
    const data = await requestFetch<ExtSwimmer[]>( `/api/swimmers/${toValue( userId ) ?? ""}` )
    return data
      .map( s => ( {
        ...s,
        birthday: format( new Date( s.birthday ), "yyyy-MM-dd" ),
        clubId: s.clubIds ? s.clubIds.split( "|" )[0] : undefined,
        rankedClub: s.rankedClubs ? Number( s.rankedClubs.split( "|" )[0] ) : undefined,
        squad: s.squads ? s.squads.split( "|" )[0] : "",
      } ) )
      .sort( ( a, b ) => {
        const last = a.lastName.localeCompare( b.lastName )
        return last || a.firstName.localeCompare( b.firstName )
      } )
  }

  // ✅ This actually produces serialized data in the SSR payload
  // watch re-fetches whenever a reactive userId changes (e.g. navigating between
  // different users' pages, which Nuxt doesn't remount by default).
  const { data, pending, error, refresh } = useAsyncData(
    `swimmers-${toValue( userId ) ?? "0"}`,
    fetchSwimmers,
    { default: () => [], watch: [ () => toValue( userId ) ] }
  )

  // ✅ Keep global reactive state in sync with SSR data
  watchEffect( () => {
    if ( data.value ) {
      swimmers.value = data.value
    }
  } )

  const clear = () => {
    swimmers.value = []
    clearNuxtData( `swimmers-${toValue( userId ) ?? "0"}` )
  }

  return {
    swimmers,
    loading: pending,
    fetchError: error,
    refresh,
    clear
  }
}
