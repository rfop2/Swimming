import { format } from "date-fns"
import type { Swimmer } from "lib"

export const useSwimmers = ( userId?: string ) => {
  const swimmers = useState<Swimmer[]>( `${userId ?? "0"}:swimmers`, () => [] )

  const fetchSwimmers = async (): Promise<Swimmer[]> => {
    const data = await $fetch<Swimmer[]>( `/api/swimmers/${userId ?? ""}` )
    return data
      .map( s => ( {
        ...s,
        birthday: format( new Date( s.birthday ), "yyyy-MM-dd" )
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
