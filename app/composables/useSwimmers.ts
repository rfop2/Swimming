import { format } from "date-fns"
import type { Swimmer } from "lib"

export const useSwimmers = ( userId?: string ) => {
  const swimmers = useState<Swimmer[]>( `swimmers-${userId}`, () => [] )
  const loading = useState<boolean>( `swimmersLoading-${userId}`, () => false )
  const fetchError = useState<unknown>( `swimmersError-${userId}`, () => null )

  const fetchSwimmers = async () => {
    if ( loading.value ) return
    loading.value = true
    fetchError.value = null

    try {
      const { data, error } = await useFetch<Swimmer[]>( `/api/swimmers/${userId ?? ""}`, {
        key: `swimmers-${userId}`,
        transform: data =>
          data.map( s => ( {
            ...s,
            birthday: format( new Date( s.birthday ), "yyyy-MM-dd" ),
          } ) ),
      } )

      if ( error.value ) {
        fetchError.value = error.value
      } else {
        swimmers.value = ( data.value || [] ).sort( ( a, b ) => {
          const lastSort = a.lastName.localeCompare( b.lastName )
          return lastSort || a.firstName.localeCompare( b.firstName )
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
    fetchSwimmers()
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
