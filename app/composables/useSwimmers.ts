import { format } from "date-fns"
import type { Swimmer } from "lib"

export const useSwimmers = async () => {
  const swimmers = useState<Swimmer[]>( "swimmers", () => [] )
  const loading = useState<boolean>( "swimmersLoading", () => false )
  const fetchError = useState<unknown>( "swimmersError", () => null )

  // --- Internal fetcher ---
  const fetchSwimmers = async (): Promise<void> => {
    loading.value = true
    fetchError.value = null

    try {
      const { data, error } = await useFetch<Swimmer[]>( "/api/swimmers", {
        key: "swimmers", // ties to clearNuxtData('swimmers')
        transform: ( data ) =>
          data.map( ( swimmer ) => ( {
            ...swimmer,
            birthday: format( new Date( swimmer.birthday ), "yyyy-MM-dd" )
          } ) )
      } )

      if ( error.value ) {
        fetchError.value = error.value
      } else {
        swimmers.value = data.value || []
        swimmers.value.sort( ( a, b ) => {
          const lastSort = a.lastName.localeCompare( b.lastName )
          if ( lastSort )
            return lastSort
          return a.firstName.localeCompare( b.firstName )
        } )
      }
    } catch ( err ) {
      fetchError.value = err
    } finally {
      loading.value = false
    }
  }

  // --- Mutations ---
  /*
  const addSwimmer = async ( newSwimmer: Omit<Swimmer, "id"> ): Promise<Swimmer> => {
    const created = await $fetch<Swimmer>( "/api/swimmers", {
      method: "POST",
      body: newSwimmer
    } )

    swimmers.value.push( {
      ...created,
      birthday: format( new Date( created.birthday ), "yyyy-MM-dd" )
    } )

    return created
  }

  const updateSwimmer = async ( updated: Swimmer ): Promise<Swimmer> => {
    const saved = await $fetch<Swimmer>( `/api/swimmers/${updated.id}`, {
      method: "PUT",
      body: updated
    } )

    const idx = swimmers.value.findIndex( ( s ) => s.id === updated.id )
    if ( idx !== -1 ) {
      swimmers.value[idx] = {
        ...saved,
        birthday: format( new Date( saved.birthday ), "yyyy-MM-dd" )
      }
    }

    return saved
  }

  const deleteSwimmer = async ( id: string ): Promise<void> => {
    await $fetch( `/api/swimmers/${id}`, { method: "DELETE" } )
    swimmers.value = swimmers.value.filter( ( s ) => s.id !== id )
  }
  */

  // --- Clear everything ---
  const clearSwimmers = (): void => {
    swimmers.value = []
    fetchError.value = null
    clearNuxtData( "swimmers" ) // invalidate fetch cache
  }

  // --- Public API ---
  if ( !swimmers.value.length ) {
    await fetchSwimmers()
  }

  return {
    swimmers,
    loading,
    fetchError,
    refreshSwimmers: fetchSwimmers,
    // addSwimmer,
    // updateSwimmer,
    // deleteSwimmer,
    clearSwimmers
  }
}
