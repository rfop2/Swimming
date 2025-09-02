import { format } from "date-fns"
import type { Swimmer } from "lib"

export const useSwimmers = async () => {
  const swimmers = useState<Swimmer[]>( "swimmers", () => [] )
  const loading = useState( "swimmersLoading", () => false )
  const fetchError = useState<unknown>( "swimmersError", () => null )

  // Only fetch if the cache is empty
  if ( !swimmers.value.length && !loading.value ) {
    loading.value = true
    try {
      const { data, error } = await useFetch( "/api/swimmers", {
        transform: ( data ) => {
          for ( const swimmer of data ) {
            swimmer.birthday = format( new Date( swimmer.birthday ), "yyyy-MM-dd" )
          }
          return data
        }
      } )

      if ( error.value ) {
        fetchError.value = error.value
        console.error( "Failed to fetch swimmers:", error.value )
      } else {
        swimmers.value = data.value || []
      }
    } catch ( err ) {
      fetchError.value = err
      console.error( "Failed to fetch swimmers:", err )
    } finally {
      loading.value = false
    }
  }

  return { swimmers, loading, fetchError }
}
