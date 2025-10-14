type PersistedMode = "state" | "reactive"

type UsePersistedReturn<T, M extends PersistedMode> =
  M extends "reactive"
    ? { state: T, ready: Ref<boolean> }
    : { state: Ref<T>, ready: Ref<boolean> }

// Deep merge utility — strictly typed
const deepMerge = <T extends Record<string, unknown>>( defaults: T, saved?: Partial<T> ): T => {
  if ( !saved ) return { ...defaults }
  const merged = { ...defaults }
  for ( const key of Object.keys( defaults ) as ( keyof T )[] ) {
    const defVal = defaults[key]
    const savedVal = saved[key]
    if ( Array.isArray( defVal ) ) {
      merged[key] = Array.isArray( savedVal ) ? ( savedVal as T[typeof key] ) : defVal
    } else if (
      typeof defVal === "object" &&
      defVal !== null &&
      typeof savedVal === "object" &&
      savedVal !== null
    ) {
      merged[key] = deepMerge( defVal as Record<string, unknown>, savedVal as Record<string, unknown> ) as T[typeof key]
    } else {
      merged[key] = ( savedVal !== undefined ? savedVal : defVal ) as T[typeof key]
    }
  }
  return merged
}

export const usePersisted = <T extends object | unknown, M extends PersistedMode = "state">(
  key: string,
  initialValue: T,
  mode: M = "state" as M,
  lazy = false
): UsePersistedReturn<T, M> => {
  const stateRef = ref( initialValue ) as Ref<T>
  const ready = ref( !lazy || import.meta.server )

  const load = (): T | undefined => {
    try {
      const raw = localStorage.getItem( key )
      if ( !raw ) return undefined
      const parsed = JSON.parse( raw ) as unknown
      if ( typeof parsed === "object" && parsed !== null && typeof initialValue === "object" && initialValue !== null ) {
        return deepMerge( initialValue as Record<string, unknown>, parsed as Record<string, unknown> ) as T
      }
      return parsed as T
    } catch {
      return undefined
    }
  }

  if ( import.meta.client ) {
    const apply = (): void => {
      const loaded = load()
      if ( loaded !== undefined ) stateRef.value = loaded
      ready.value = true
    }

    if ( lazy ) onMounted( () => apply() )
    else apply()

    watch(
      stateRef,
      ( val ) => {
        try {
          localStorage.setItem( key, JSON.stringify( val ) )
        } catch {
          // ignore quota errors
        }
      },
      { deep: true }
    )

    window.addEventListener( "storage", ( e: StorageEvent ) => {
      if ( e.key !== key || !e.newValue ) return
      try {
        const parsed = JSON.parse( e.newValue ) as unknown
        if ( typeof parsed === "object" && parsed !== null && typeof initialValue === "object" && initialValue !== null ) {
          stateRef.value = deepMerge(
            initialValue as Record<string, unknown>,
            parsed as Record<string, unknown>
          ) as T
        } else {
          stateRef.value = parsed as T
        }
      } catch {
        /* ignore */
      }
    } )
  }

  if ( mode === "reactive" ) {
    if ( typeof stateRef.value !== "object" || stateRef.value === null ) {
      throw new Error( `usePersisted("${key}") in 'reactive' mode requires an object initialValue` )
    }

    const reactiveState = reactive( { ...stateRef.value } ) as T

    if ( import.meta.client ) {
      onMounted( () => {
        Object.assign( reactiveState as object, stateRef.value as object )
        watch(
          reactiveState as object,
          ( val ) => {
            stateRef.value = val as T
            try {
              localStorage.setItem( key, JSON.stringify( val ) )
            } catch {
              /* ignore quota errors */
            }
          },
          { deep: true }
        )
      } )
    }

    return { state: reactiveState, ready } as UsePersistedReturn<T, M>
  }

  return { state: stateRef, ready } as UsePersistedReturn<T, M>
}
