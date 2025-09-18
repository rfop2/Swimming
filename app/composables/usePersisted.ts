type PersistedMode = "reactive" | "state"

type UsePersistedReturn<T, M extends PersistedMode> =
  M extends "reactive" ? { state: T, ready: Ref<boolean> } : { state: Ref<T>, ready: Ref<boolean> }

export const usePersisted = <T, M extends PersistedMode = "state">(
  key: string,
  initialValue: T,
  mode?: M,
  lazy = false
): UsePersistedReturn<T, M> => {
  const state = useState<T>( key, () => initialValue )
  const ready = ref( !lazy || import.meta.server )

  const load = (): T => {
    try {
      const raw = localStorage.getItem( key )
      if ( raw ) return JSON.parse( raw ) as T
    } catch ( err ) {
      console.warn( `Failed to parse persisted state for "${key}"`, err )
    }
    return initialValue
  }

  if ( import.meta.client ) {
    const applyPersisted = () => {
      state.value = load()
      ready.value = true
    }

    if ( lazy ) {
      onMounted( applyPersisted )
    } else {
      applyPersisted()
    }

    watch(
      state,
      ( val ) => {
        localStorage.setItem( key, JSON.stringify( val ) )
      },
      { deep: true }
    )

    window.addEventListener( "storage", ( event ) => {
      if ( event.key === key && event.newValue ) {
        state.value = JSON.parse( event.newValue ) as T
      }
    } )
  }

  if ( mode === "reactive" ) {
    if ( typeof state.value === "object" && state.value !== null ) {
      const reactiveState = reactive( { ...state.value } ) as T

      if ( import.meta.client ) {
        watch(
          reactiveState as object,
          ( val ) => {
            state.value = val as T
            localStorage.setItem( key, JSON.stringify( val ) )
          },
          { deep: true }
        )
      }

      return { state: reactiveState, ready } as UsePersistedReturn<T, M>
    } else {
      throw new Error(
        `usePersisted("${key}") in 'reactive' mode requires an object as initialValue`
      )
    }
  }

  // state mode
  return { state, ready } as UsePersistedReturn<T, M>
}
