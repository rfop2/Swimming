import type { UserClub } from "lib"

export const useUserClubs = ( userId?: string ) => {
  const userClubs = useState<UserClub[]>( `${userId ?? "0"}:userClubs`, () => [] )

  const fetchUserClubs = async (): Promise<UserClub[]> => {
    const data = await $fetch<UserClub[]>( `/api/userclubs/${userId ?? ""}` )
    return data
  }

  // ✅ This actually produces serialized data in the SSR payload
  const { data, pending, error, refresh } = useAsyncData( `userclubs-${userId ?? "0"}`, fetchUserClubs, { default: () => [] } )

  // ✅ Keep global reactive state in sync with SSR data
  watchEffect( () => {
    if ( data.value ) {
      userClubs.value = data.value
    }
  } )

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
  const clear = () => {
    userClubs.value = []
    clearNuxtData( `userclubs-${userId}` )
  }

  return {
    userClubs,
    loading: pending,
    fetchError: error,
    refresh,
    // addClub,
    // updateClub,
    // deleteClub,
    clear
  }
}
