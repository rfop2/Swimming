// /middleware/init.global.ts
export default defineNuxtRouteMiddleware( async () => {
  const { refresh } = useSessionUser()
  await refresh()
} )
