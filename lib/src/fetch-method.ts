export type FetchMethod = "scraperapi" | "nordvpn"

let fetchMethod: FetchMethod | null = null
let logged = false

// Resolves and caches which upstream fetch method to use, so the choice is made
// once per run and every caller (fetchPage, fetchPages, fetchPageBrowser, setup
// code) agrees on it instead of re-checking env vars independently. The method
// is logged the first time it's used for real; pass quiet for setup-time lookups
// so runs that end up fetching nothing (e.g. an empty cron queue) stay silent.
export const getFetchMethod = ( { quiet = false }: { quiet?: boolean } = {} ): FetchMethod => {
  if ( !fetchMethod ) {
    if ( process.env.SCRAPER_API_KEY ) {
      fetchMethod = "scraperapi"
    } else if ( process.env.NORDVPN_SC_USERNAME && process.env.NORDVPN_SC_PASSWORD ) {
      fetchMethod = "nordvpn"
    } else {
      throw new Error( "No fetch method configured: set SCRAPER_API_KEY or NORDVPN_SC_USERNAME/NORDVPN_SC_PASSWORD" )
    }
  }

  if ( !quiet && !logged ) {
    logged = true
    console.log( `Using fetch method: ${fetchMethod}` )
  }
  return fetchMethod
}
