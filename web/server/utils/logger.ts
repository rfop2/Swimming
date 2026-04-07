const debugEnabled = process.env.DEBUG === "true" || process.env.NODE_ENV !== "production"

export const logger = {
  log:   ( ...args: unknown[] ) => {
    if ( debugEnabled ) console.log( ...args ) 
  },
  warn:  ( ...args: unknown[] ) => {
    if ( debugEnabled ) console.warn( ...args ) 
  },
  error: ( ...args: unknown[] ) => {
    console.error( ...args ) 
  },
}
