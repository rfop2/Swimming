export default defineNuxtPlugin( async () => {
  const { refresh } = useSessionUser()

  await refresh()
} )
