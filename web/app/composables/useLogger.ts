const debugEnabled = import.meta.dev || import.meta.env?.VITE_DEBUG === "true"

export const useLogger = () => ( {
  log:   ( ...args: unknown[] ) => {
    if ( debugEnabled ) console.log( ...args ) 
  },
  warn:  ( ...args: unknown[] ) => {
    if ( debugEnabled ) console.warn( ...args ) 
  },
  error: ( ...args: unknown[] ) => {
    console.error( ...args ) 
  },
} )
