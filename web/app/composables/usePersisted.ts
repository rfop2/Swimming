import {
  isRef,
  onMounted,
  reactive,
  ref,
  toRaw,
  watch,
  type Ref,
} from "vue"

type PersistedMode = "state" | "reactive"
type Persistable = string | number | boolean | null | undefined | object

type UsePersistedReturnState<T> = { state: Ref<T>; ready: Ref<boolean> }
type UsePersistedReturnReactive<T extends object> = { state: T; ready: Ref<boolean> }

// 1) Backwards compatible: create internal state ref (state mode)
export function usePersisted<T extends Persistable>(
  key: string,
  initialValue: T,
  mode?: "state"
): UsePersistedReturnState<T>

// 2) Backwards compatible: create internal reactive object (reactive mode, object only)
export function usePersisted<T extends object>(
  key: string,
  initialValue: T,
  mode: "reactive"
): UsePersistedReturnReactive<T>

// 3) New: attach persistence to an existing ref (singleton-friendly)
export function usePersisted<T extends Persistable>(
  key: string,
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  state: Ref<T>,
  mode?: "state"
): UsePersistedReturnState<T>

export function usePersisted<T extends Persistable>(
  key: string,
  initialOrRef: T | Ref<T>,
  mode: PersistedMode = "state"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): UsePersistedReturnState<T> | UsePersistedReturnReactive<any> {
  const ready = ref( false )

  // Cookie MUST be created synchronously during setup
  const cookie = useRawCookie<string>( key, {
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  } )

  const parseCookie = (): T | undefined => {
    if ( cookie.value == null ) return undefined
    try {
      return ( JSON.parse( cookie.value ) as { v: T } ).v
    } catch {
      return undefined
    }
  }

  const writeCookie = ( val: T ) => {
    try {
      cookie.value = JSON.stringify( { v: toRaw( val ) } )
    } catch {
      /* ignore */
    }
  }

  // ----------------------------
  // STATE MODE
  // ----------------------------
  if ( mode === "state" ) {
    // Use external ref if provided, otherwise create internal one
    const state: Ref<T> = isRef( initialOrRef )
      ? ( initialOrRef as Ref<T> )
      : ( ref<T>( structuredClone( initialOrRef as T ) ) as Ref<T> )

    // Restore from cookie once
    const restored = parseCookie()
    if ( restored !== undefined ) {
      state.value = restored
    }

    // Persist on change
    watch(
      state,
      ( val ) => writeCookie( val ),
      { deep: true, flush: "post" }
    )

    // Ensure a browser cookie exists even if value never changes on client
    if ( import.meta.client ) {
      onMounted( () => writeCookie( state.value ) )
    }

    ready.value = true
    return { state, ready }
  }

  // ----------------------------
  // REACTIVE MODE (object only)
  // ----------------------------
  // If someone tries to pass a Ref into reactive mode, that’s ambiguous; we treat it as unsupported.
  // Reactive mode is intended to *create* a reactive object (form-model friendly).
  if ( isRef( initialOrRef ) ) {
    throw new Error(
      `usePersisted("${key}", ref, "reactive") is not supported. ` +
        "Use \"state\" mode for refs, or pass an object initialValue for \"reactive\" mode."
    )
  }

  const initialValue = initialOrRef as T
  if ( typeof initialValue !== "object" || initialValue === null ) {
    throw new Error(
      `usePersisted("${key}") in 'reactive' mode requires an object initialValue`
    )
  }

  // Restore object from cookie, otherwise clone initialValue
  const restored = parseCookie()
  const base = ( restored !== undefined ? restored : structuredClone( initialValue ) ) as object

  const state = reactive( base ) as T & object

  watch(
    state,
    ( val ) => writeCookie( val as unknown as T ),
    { deep: true, flush: "post" }
  )

  if ( import.meta.client ) {
    onMounted( () => writeCookie( state as unknown as T ) )
  }

  ready.value = true
  return { state, ready }
}
