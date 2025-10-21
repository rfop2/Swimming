export const useImpersonation = () => {
  const { refresh } = useSessionUser()
  const impersonating = useState( "impersonating" )

  const impersonate = async ( userId: string ) => {
    await $fetch( "/api/admin/impersonate", {
      method: "POST",
      body: { targetUserId: userId },
      credentials: "include",
    } )
    await refresh()
  }

  const revert = async () => {
    await $fetch( "/api/admin/revert", {
      method: "POST",
      credentials: "include",
    } )
    await refresh()
  }

  return { impersonating, impersonate, revert }
}
