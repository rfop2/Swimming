import type { CookieOptions } from "#app"

type WritableCookieOptions<T> =
  Omit<CookieOptions<T>, "readonly" | "encode" | "decode">

export const useRawCookie = <T extends string = string>(
  key: string,
  options?: WritableCookieOptions<T>
) => {
  return useCookie<T>( key, {
    ...options,
    readonly: false,
    encode: ( v: T ) => v,
    decode: ( v: T ) => v,
  } )
}
