import type { User } from "lucia"

export const useSessionUser = () => {
  const user = useState<User | null>( "user", () => null )
  const impersonating = useState( "impersonating", () => false )
  const loadingUser = useState( "userLoading", () => false )

  const refresh = async () => {
    // Prevent concurrent refreshes
    if ( loadingUser.value ) return
    loadingUser.value = true

    try {
      const data = await $fetch<{ user: User, impersonating: boolean }>( "/api/auth/me", { credentials: "include" } )
      user.value = data.user
      impersonating.value = data.impersonating
    } catch {
      user.value = null
      impersonating.value = false
    } finally {
      loadingUser.value = false
    }
  }

  if ( user.value === null && !loadingUser.value ) refresh()

  return { user, impersonating, refresh, loadingUser }
}
