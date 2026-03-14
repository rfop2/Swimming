import { format } from "date-fns"
import type { ExtSwimmer } from "lib"

export const useSwimmers = ( userId?: string ) => {
  const swimmers = useState<ExtSwimmer[]>( `${userId ?? "0"}:swimmers`, () => [] )

  const fetchSwimmers = async (): Promise<ExtSwimmer[]> => {
    const url = userId ? `/api/swimmers/${userId}` : "/api/swimmers"
    const data = await $fetch<ExtSwimmer[]>( url )
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
  const { data, pending, error, refresh } = useAsyncData( `swimmers-${userId ?? "0"}`, fetchSwimmers, { default: () => [] } )

  // ✅ Keep global reactive state in sync with SSR data
  watchEffect( () => {
    if ( data.value ) {
      swimmers.value = data.value
    }
  } )

  const clear = () => {
    swimmers.value = []
    clearNuxtData( `swimmers-${userId}` )
  }

  return {
    swimmers,
    loading: pending,
    fetchError: error,
    refresh,
    clear
  }
}
