export const useAppReset = () => {
  return async () => {
    // 1. Clear all Nuxt async data caches
    refreshNuxtData()

    // 2. Clear any global useState() values
    //    Add each user-scoped piece of state here.
    useState( "0:swimmers" ).value = []
    useState( "0:userClubs" ).value = []
    useState( "tasks" ).value = []
    // ... add as needed

    // 3. Optionally clear any local caches or stores
    // e.g., piniaStore.reset() if using Pinia
  }
}
