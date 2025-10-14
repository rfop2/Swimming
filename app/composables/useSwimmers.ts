import { format } from "date-fns"
import type { Swimmer } from "lib"

export const useSwimmers = ( userId?: string ) => {
  const swimmers = useState<Swimmer[]>( `swimmers-${userId ?? "0"}`, () => [] )
  const loading = useState<boolean>( `swimmersLoading-${userId ?? "0"}`, () => false )
  const fetchError = useState<{ status: number | null, message: string | null }> (
    `swimmersError-${userId}`,
    () => ( { status: null, message: null } )
  )

  const fetchSwimmers = async (): Promise<Swimmer[]> => {
    loading.value = true
    fetchError.value = { status: null, message: null }

    try {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch ( err: any ) {
      fetchError.value = { status: err?.status ?? null, message: String( err?.message ?? err ) }
      return []
    } finally {
      loading.value = false
    }
  }

  // ✅ This actually produces serialized data in the SSR payload
  const { data } = useAsyncData( `swimmers-${userId ?? "0"}`, fetchSwimmers, { default: () => [] } )

  // ✅ Keep global reactive state in sync with SSR data
  watchEffect( () => {
    if ( data.value && data.value.length ) swimmers.value = data.value
  } )

  const refresh = async () => {
    const newData = await fetchSwimmers()
    swimmers.value = newData
  }

  const clear = () => {
    swimmers.value = []
    clearNuxtData( `swimmers-${userId}` )
  }

  return { swimmers, loading, fetchError, refresh, clear }
}
