export const usePersistedState = <T extends object>(
  key: string,
  initialValue: T
) => {
  let stored: Partial<T> = {}

  if ( import.meta.client ) {
    try {
      const raw = localStorage.getItem( key )
      if ( raw ) {
        stored = JSON.parse( raw )
      }
    } catch ( err ) {
      console.warn( `Failed to parse persisted state for "${key}"`, err )
    }
  }

  const state = reactive( { ...initialValue, ...stored } ) as T

  if ( import.meta.client ) {
    watch(
      state,
      ( val ) => {
        localStorage.setItem( key, JSON.stringify( val ) )
      },
      { deep: true }
    )
  }

  return state
}
