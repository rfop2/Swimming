import {
  BASE_URL,
} from "./config.js"

export const createUrl = ( base: string, params: Record<string, string> ) => {
  const url = new URL( BASE_URL + base )
  url.search = new URLSearchParams( params ).toString()
  return url
}
