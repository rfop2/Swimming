import type { User } from "lucia"

export const useSessionUser = () => {
  const user = useState<User | null>( "user", () => null )
  const impersonating = useState( "impersonating", () => false )

  const refresh = async () => {
    try {
      const data = await $fetch<{ user: User, impersonating: boolean }>( "/api/auth/me", { credentials: "include" } )
      user.value = data.user
      impersonating.value = data.impersonating
    } catch {
      user.value = null
      impersonating.value = false
    }
  }

  if ( user.value === null ) refresh()

  return { user, impersonating, refresh }
}
