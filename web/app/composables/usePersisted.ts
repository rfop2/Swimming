type PersistedMode = "state" | "reactive"

type UsePersistedReturn<T, M extends PersistedMode> =
  M extends "reactive"
    ? { state: T; ready: Ref<boolean> }
    : { state: Ref<T>; ready: Ref<boolean> }

export const usePersisted = <
  T extends object | unknown,
  M extends PersistedMode = "state"
>(
    key: string,
    initialValue: T,
    mode: M = "state" as M
  ): UsePersistedReturn<T, M> => {
  const { user } = useSessionUser()

  const ready = ref( true )

  const userKey = computed( () => `${user.value?.id ?? "0"}:${key}` )

  const cookie = useRawCookie<string>( userKey.value, {
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  } )

  // --- initialise state (SSR-safe) ---
  let initial = initialValue

  if ( cookie.value !== undefined ) {
    try {
      const parsed = JSON.parse( cookie.value ) as { v: T }
      initial = parsed.v
    } catch {
    // ignore malformed cookie
    }
  }

  const stateRef = ref( initial ) as Ref<T>

  // --- persist ---
  watch(
    stateRef,
    ( val ) => {
      try {
        cookie.value = JSON.stringify( { v: val } )
      } catch {
      /* ignore */
      }
    },
    { deep: true }
  )

  // Reactive mode (form-model friendly)
  if ( mode === "reactive" ) {
    if ( typeof stateRef.value !== "object" || stateRef.value === null ) {
      throw new Error(
        `usePersisted("${userKey.value}") in 'reactive' mode requires an object initialValue`
      )
    }

    const reactiveState = reactive( stateRef.value ) as T

    watch(
      reactiveState as object,
      ( val ) => {
        stateRef.value = val as T
      },
      { deep: true }
    )

    return { state: reactiveState, ready } as UsePersistedReturn<T, M>
  }

  return { state: stateRef, ready } as UsePersistedReturn<T, M>
}
