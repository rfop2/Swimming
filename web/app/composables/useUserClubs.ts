import { toValue, type MaybeRefOrGetter } from "vue"
import type { UserClub } from "lib"

export const useUserClubs = ( userId?: MaybeRefOrGetter<string | undefined> ) => {
  const userClubs = useState<UserClub[]>( `${toValue( userId ) ?? "0"}:userClubs`, () => [] )

  const fetchUserClubs = async (): Promise<UserClub[]> => {
    const data = await $fetch<UserClub[]>( `/api/userclubs/${toValue( userId ) ?? ""}` )
    return data
  }

  // ✅ This actually produces serialized data in the SSR payload
  // watch re-fetches whenever a reactive userId changes (e.g. navigating between
  // different users' pages, which Nuxt doesn't remount by default) — see useSwimmers.ts.
  const { data, pending, error, refresh } = useAsyncData(
    `userclubs-${toValue( userId ) ?? "0"}`,
    fetchUserClubs,
    { default: () => [], watch: [ () => toValue( userId ) ] }
  )

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
    clearNuxtData( `userclubs-${toValue( userId ) ?? "0"}` )
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
