export const useImpersonation = () => {
  const impersonating = useState( "impersonating", () => false )

  const impersonate = async ( userId: string ) => {
    await $fetch( "/api/admin/impersonate", {
      method: "POST",
      body: { targetUserId: userId },
      credentials: "include", // important so cookies are kept
    } )

    impersonating.value = true
    await refreshNuxtData() // reload user info
  }

  const revert = async () => {
    await $fetch( "/api/admin/revert", {
      method: "POST",
      credentials: "include",
    } )

    impersonating.value = false
    await refreshNuxtData()
  }

  return { impersonating, impersonate, revert }
}
