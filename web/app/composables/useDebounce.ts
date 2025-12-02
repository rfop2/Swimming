// import debounce from "lodash.debounce"

const debounce = <F extends ( ...args: unknown[] ) => void>(
  func: F,
  delay = 300
): ( ( ...args: Parameters<F> ) => void ) => {
  let timer: NodeJS.Timeout
  return ( ...args: Parameters<F> ) => {
    clearTimeout( timer )
    timer = setTimeout( () => func( ...args ), delay )
  }
}

export const useDebounce = ( fn: () => void, delay = 300 ) => {
  return debounce( fn, delay )
}
