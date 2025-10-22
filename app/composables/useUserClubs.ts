import type { UserClub } from "lib"

export const useUserClubs = ( userId?: string ) => {
  const userClubs = useState<UserClub[]>( `${userId ?? "0"}:userClubs`, () => [] )
  const loading = useState<boolean>( `${userId ?? "0"}:userClubsLoading`, () => false )
  const fetchError = useState<unknown>( `${userId ?? "0"}:userClubsError`, () => null )

  const fetchUserClubs = async () => {
    if ( loading.value ) return
    loading.value = true
    fetchError.value = null

    try {
      const { data, error } = await useFetch<UserClub[]>( `/api/userclubs/${userId ?? ""}`, {
        // key: `clubs-${userId}`,
      } )

      if ( error.value ) {
        fetchError.value = error.value
      } else {
        userClubs.value = ( data.value || [] ).sort( ( a, b ) => {
          return ( a?.clubName ?? "" ).localeCompare( b?.clubName ?? "" )
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
  const addClub = async ( newClub: Omit<UserClub, "id"> ): Promise<UserClub> => {
    const created = await $fetch<UserClub>( "/api/clubs", {
      method: "POST",
      body: newClub
    } )

    clubs.value.push( {
      ...created,
      birthday: format( new Date( created.birthday ), "yyyy-MM-dd" )
    } )

    return created
  }

  const updateClub = async ( updated: UserClub ): Promise<UserClub> => {
    const saved = await $fetch<UserClub>( `/api/clubs/${updated.id}`, {
      method: "PUT",
      body: updated
    } )

    const idx = clubs.value.findIndex( ( s ) => s.id === updated.id )
    if ( idx !== -1 ) {
      clubs.value[idx] = {
        ...saved,
        birthday: format( new Date( saved.birthday ), "yyyy-MM-dd" )
      }
    }

    return saved
  }

  const deleteClub = async ( id: string ): Promise<void> => {
    await $fetch( `/api/clubs/${id}`, { method: "DELETE" } )
    clubs.value = clubs.value.filter( ( s ) => s.id !== id )
  }
  */

  // --- Clear everything ---
  const clearUserClubs = (): void => {
    userClubs.value = []
    fetchError.value = null
    clearNuxtData( "userClubs" ) // invalidate fetch cache
  }

  // --- Public API ---
  if ( !userClubs.value.length ) {
    fetchUserClubs()
  }

  return {
    userClubs,
    loading,
    fetchError,
    refresh: fetchUserClubs,
    // addClub,
    // updateClub,
    // deleteClub,
    clear: clearUserClubs,
  }
}
